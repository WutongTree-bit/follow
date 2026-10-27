// Fetching a broker's data from QCC, in the worker (a reader's visit only asks for it: page.ts).
// A broker without a confirmed subject is looked up first; a confirmed one gets every block of its three
// tabs. A failed block keeps its message; a spent budget stops the whole run and keeps the old data.
import { sql } from "@aihot/backend/db";
import { defineQueue, type ModuleQueue } from "@aihot/backend/modules";
import { enqueueOn, ensureQueue } from "@aihot/backend/jobs/queue";
import { BudgetExceededError, ProviderRejectedError, ReceiptBusyError, ReceiptUnknownError } from "@aihot/backend/providers/receipts";
import type { QccBlock, QccOverview, QccTab } from "../contract.ts";
import { BLOCKS, TENDER_LIST, TENDER_PROFILE } from "./catalog.ts";
import { callTool, type ToolAnswer } from "./client.ts";
import { CACHE_DAYS, loadConfig, type QccConfig } from "./config.ts";
import { brokerTopic, ensureEntities, recordLookup, type EntityRow } from "./entities.ts";

export interface RefreshJob {
  slug: string;
  /**
   * The run's identity in its receipts. It is kept until a run completes, so a run that stopped (a spent
   * budget, a crash) and the next one asked for reuse every answer already paid for.
   */
  requestedAt: string;
}

export const refreshQueue: ModuleQueue<RefreshJob> = defineQueue<RefreshJob>({
  name: "qcc.refresh",
  options: { policy: "short", retryLimit: 2, retryDelay: 120, retryBackoff: true, expireInSeconds: 900 },
  worker: { batchSize: 1, pollingIntervalSeconds: 2 },
  run: async (jobs) => {
    for (const job of jobs) await refreshBroker(job);
  },
});

/** After a failed run, visits wait this long before asking again. */
const FAILURE_PAUSE_MINUTES = 30;

/** Brokers with a run waiting, retrying or being worked: the queue itself is the record, so none is ever stuck. */
export async function pendingRuns(slugs?: string[]): Promise<Set<string>> {
  await ensureQueue(refreshQueue.name, refreshQueue.options);
  const rows = await sql<{ slug: string }[]>`
    SELECT DISTINCT singleton_key AS slug FROM pgboss.job
    WHERE name = ${refreshQueue.name} AND state IN ('created', 'retry', 'active')
      ${slugs ? sql`AND singleton_key = ANY(${slugs})` : sql``}`;
  return new Set(rows.map((r) => r.slug));
}

/** Whether a visit should ask for this broker's data: never looked up, or confirmed and older than the cache. */
export function needsRefresh(row: EntityRow, now = Date.now()): boolean {
  if (row.last_error && now - row.updated_at.getTime() < FAILURE_PAUSE_MINUTES * 60_000) return false;
  if (row.status === "unresolved") return true;
  return row.status === "locked" && (!row.fetched_at || now - row.fetched_at.getTime() > CACHE_DAYS * 86_400_000);
}

/** Queues a run for the broker; `force` (the admin) skips the cache and failure pause. Returns whether one is pending. */
export async function requestRefresh(slug: string, opts: { force?: boolean } = {}): Promise<boolean> {
  await ensureEntities([slug]);
  if ((await pendingRuns([slug])).has(slug)) return true;
  const [row] = await sql<EntityRow[]>`SELECT * FROM qcc_entities WHERE slug = ${slug}`;
  if (!row) return false;
  if (opts.force ? row.status === "candidates" : !needsRefresh(row)) return false;
  // An unfinished run's identity is reused for a day; older answers are not worth keeping.
  const resume = row.requested_at && Date.now() - row.requested_at.getTime() < 86_400_000;
  const requestedAt = resume ? row.requested_at!.toISOString() : new Date().toISOString();
  return sql.begin(async (tx) => {
    // A run queued at the same moment by another visit wins; this one then adds nothing.
    const id = await enqueueOn(refreshQueue, { slug, requestedAt }, { singletonKey: slug }, tx);
    if (id) await tx`UPDATE qcc_entities SET requested_at = ${requestedAt}, last_error = NULL, updated_at = now() WHERE slug = ${slug}`;
    return true;
  });
}

const failure = (error: unknown): string => {
  if (error instanceof ReceiptUnknownError) return "请求结果不明，稍后会自动重试";
  if (error instanceof ProviderRejectedError) return error.message.replace(/^qcc\s*/, "").slice(0, 300);
  return String((error as Error)?.message ?? error).slice(0, 300);
};

/** Stops the run: nothing was sent, a later run can do it all. */
const stopsRun = (error: unknown) => error instanceof BudgetExceededError || error instanceof ReceiptBusyError;

async function call(config: QccConfig, role: string, tool: string, args: Record<string, unknown>, subject: string, identity: unknown): Promise<ToolAnswer> {
  const server = config.servers.find((s) => s.role === role);
  if (!server) return { data: null, error: `没有配置企查查的 ${role} 服务` };
  return callTool(server, tool, args, { subject, identity });
}

/** Runs the job: a lookup for a broker without a subject, otherwise every block. */
export async function refreshBroker(job: RefreshJob): Promise<void> {
  const topic = brokerTopic(job.slug);
  const { config } = await loadConfig();
  const [row] = await sql<EntityRow[]>`SELECT * FROM qcc_entities WHERE slug = ${job.slug}`;
  if (!topic || !config || !row) return;
  try {
    if (row.status === "locked" && row.name) await fetchBlocks(config, row, job);
    else if (row.status === "unresolved" || row.status === "missing") {
      const answer = await call(config, "company", "get_company_by_query", { searchKey: topic.name }, `qcc:${job.slug}`, job.requestedAt);
      if (answer.error && !/未匹配/.test(answer.error)) throw new Error(answer.error);
      const status = await recordLookup(topic, answer.data);
      // QCC took a lone match itself: carry on with its data in the same run.
      if (status === "locked") {
        const [locked] = await sql<EntityRow[]>`SELECT * FROM qcc_entities WHERE slug = ${job.slug}`;
        if (locked?.name) await fetchBlocks(config, locked, job);
      }
    }
    // Done: the next run is a new request with new receipts.
    await sql`UPDATE qcc_entities SET requested_at = NULL, updated_at = now() WHERE slug = ${job.slug} AND requested_at = ${job.requestedAt}`;
  } catch (error) {
    // The identity stays, so the next run reuses the answers this one paid for.
    await sql`UPDATE qcc_entities SET last_error = ${failure(error)}, updated_at = now() WHERE slug = ${job.slug}`;
    // Budget and in-flight stops are retried by the queue; anything else waits for the next visit.
    if (stopsRun(error)) throw error;
  }
}

async function fetchBlocks(config: QccConfig, row: EntityRow, job: RefreshJob): Promise<void> {
  const name = row.name!;
  const subject = `qcc:${row.slug}`;
  const day = job.requestedAt.slice(0, 10);
  const blocks = new Map<QccTab, QccBlock[]>([["company", []], ["legal", []], ["tender", []]]);
  const add = (tab: QccTab, block: QccBlock) => blocks.get(tab)!.push(block);
  const attempt = async (tab: QccTab, spec: { key: string; title: string; view: QccBlock["view"] }, run: () => Promise<ToolAnswer>) => {
    try {
      const answer = await run();
      add(tab, { key: spec.key, title: spec.title, view: spec.view, ok: !answer.error, data: answer.data, error: answer.error });
      return answer;
    } catch (error) {
      if (stopsRun(error)) throw error;
      add(tab, { key: spec.key, title: spec.title, view: spec.view, ok: false, data: null, error: failure(error) });
      return null;
    }
  };

  for (const spec of BLOCKS) {
    await attempt(spec.tab, spec, () => call(config, spec.role, spec.tool, spec.args(name), subject, spec.shared ? { shared: day } : job.requestedAt));
  }

  const profile = await attempt(TENDER_PROFILE.tab, TENDER_PROFILE, async () => {
    const answer = await call(config, TENDER_PROFILE.role, TENDER_PROFILE.tool, { keywords: [name] }, subject, job.requestedAt);
    if (answer.error) return answer;
    const list = ((answer.data as Record<string, unknown>)?.["企业列表"] ?? []) as Array<Record<string, unknown>>;
    const match = list.find((c) => c["统一社会信用代码"] === row.credit_code) ?? list.find((c) => c["企业名称"] === name);
    return match ? { data: match, error: null } : { data: null, error: "标讯库里没有找到这家公司" };
  });
  const tenderId = (profile?.data as Record<string, unknown> | null)?.["企业ID"];
  if (typeof tenderId === "string" && tenderId) {
    await attempt(TENDER_LIST.tab, TENDER_LIST, () => call(config, TENDER_LIST.role, TENDER_LIST.tool, { id: tenderId }, subject, job.requestedAt));
  }

  const all = [...blocks.values()].flat();
  if (!all.some((b) => b.ok)) throw new Error(all.find((b) => b.error)?.error ?? "没有拿到任何数据");
  const overview = overviewOf(all);
  await sql.begin(async (tx) => {
    for (const [tab, list] of blocks) {
      // Sent as text and cast to json (tx.json sends jsonb, which reorders keys): keeps QCC's order of fields.
      await tx`INSERT INTO qcc_sections (slug, tab, blocks, fetched_at) VALUES (${row.slug}, ${tab}, ${JSON.stringify(list)}::text::json, now())
               ON CONFLICT (slug, tab) DO UPDATE SET blocks = EXCLUDED.blocks, fetched_at = EXCLUDED.fetched_at`;
    }
    await tx`UPDATE qcc_entities SET fetched_at = now(), overview = ${tx.json(overview as never)}, last_error = NULL, updated_at = now() WHERE slug = ${row.slug}`;
  });
}

const str = (v: unknown): string | null => (v == null || v === "" ? null : Array.isArray(v) ? v.join("、") : String(v));
const int = (v: unknown): number | null => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : n;
};

/** The headline facts, from the blocks that carry them. */
export function overviewOf(blocks: QccBlock[]): QccOverview {
  const data = (key: string) => {
    const b = blocks.find((x) => x.key === key && x.ok);
    return b && b.data && typeof b.data === "object" && !Array.isArray(b.data) ? (b.data as Record<string, unknown>) : null;
  };
  const reg = data("registration");
  const listing = data("listing");
  const risk = data("risk");
  const tender = data("profile");
  const factors = Array.isArray(risk?.["风险因子扫描"]) ? (risk!["风险因子扫描"] as Array<Record<string, unknown>>) : [];
  const factor = (name: string) => int(factors.find((f) => f["风险因子"] === name)?.["条目数"]);
  const code = str(listing?.["股票代码"]);
  return {
    legalRep: str(reg?.["法定代表人"]),
    capital: str(reg?.["注册资本"]),
    founded: str(reg?.["成立日期"]),
    companyType: str(reg?.["企业类型"]),
    state: str(reg?.["登记状态"])?.replace(/（.*$/, "") ?? null,
    region: str(reg?.["所属地区"]),
    stock: code ? { code, name: str(listing?.["股票简称"]), exchange: str(listing?.["上市交易所"]), marketCap: str(listing?.["总市值"]) } : null,
    riskHits: int(risk?.["有记录因子数"]),
    riskTotal: factors.length || null,
    judgments: factor("裁判文书"),
    wins: int(tender?.["中标数"]),
    tenders: int(tender?.["相关标讯数"]),
  };
}
