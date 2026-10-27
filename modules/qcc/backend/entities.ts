// Which registered company each broker (a company topic) is at QCC. QCC's rule: a short name goes to
// get_company_by_query first, and when several companies match, a person picks one; nothing may pick for
// them. So a lone match is taken, several wait for the admin, who sees the one whose registered name is
// the broker's name plus a company form as the suggestion.
import { sql } from "@aihot/backend/db";
import { audit } from "@aihot/backend/audit";
import { TOPICS, type Topic } from "@aihot/backend/publication/topics";
import type { QccCandidate, QccEntityStatus } from "../contract.ts";

/** The brokers: the site's company topics. */
export function brokerTopics(): Topic[] {
  return TOPICS.filter((t) => t.group === "company");
}

export function brokerTopic(slug: string): Topic | null {
  return brokerTopics().find((t) => t.slug === slug) ?? null;
}

export interface EntityRow {
  slug: string;
  status: QccEntityStatus;
  name: string | null;
  credit_code: string | null;
  candidates: QccCandidate[];
  suggested: string | null;
  confirmed_by: string | null;
  requested_at: Date | null;
  fetched_at: Date | null;
  last_error: string | null;
  overview: unknown;
  updated_at: Date;
}

export async function entityRows(slugs?: string[]): Promise<Map<string, EntityRow>> {
  const rows = slugs
    ? await sql<EntityRow[]>`SELECT * FROM qcc_entities WHERE slug = ANY(${slugs})`
    : await sql<EntityRow[]>`SELECT * FROM qcc_entities`;
  return new Map(rows.map((r) => [r.slug, r]));
}

const FORMS = ["股份有限公司", "有限责任公司", "有限公司"];
const fold = (s: string) => s.replace(/（/g, "(").replace(/）/g, ")").replace(/\s+/g, "");

/** The candidate named exactly like the broker (any of its names, optionally "证券") plus a company form. */
export function suggestCandidate(topic: Pick<Topic, "name" | "aliases">, candidates: QccCandidate[]): string | null {
  const names = [topic.name, ...topic.name.split("/"), ...topic.aliases].map((n) => fold(n.trim())).filter(Boolean);
  const exact = candidates.filter((c) => {
    const full = fold(c.name);
    return names.some((n) => full.startsWith(n) && [...FORMS, ...FORMS.map((f) => `证券${f}`)].includes(full.slice(n.length)));
  });
  return exact.length === 1 ? exact[0]!.creditCode : null;
}

/** get_company_by_query's answer → candidates, and whether QCC locked a single one itself. */
export function readCandidates(data: unknown): { candidates: QccCandidate[]; single: boolean } {
  const d = (data ?? {}) as Record<string, unknown>;
  const list = Array.isArray(d["企业信息"]) ? (d["企业信息"] as Array<Record<string, unknown>>) : [];
  const text = (v: unknown) => (Array.isArray(v) ? v.join("、") : v == null || v === "" ? null : String(v));
  const candidates = list
    .map((c) => ({
      name: String(c["企业名称"] ?? ""),
      creditCode: String(c["统一社会信用代码"] ?? ""),
      founded: text(c["成立日期"]),
      legalRep: text(c["法定代表人名称"] ?? c["法定代表人"]),
      status: text(c["状态"] ?? c["登记状态"]),
    }))
    .filter((c) => c.name && c.creditCode);
  return { candidates, single: candidates.length === 1 && d["匹配结果"] !== "多候选" };
}

/** Records the lookup's outcome for a broker that has none confirmed. */
export async function recordLookup(topic: Topic, data: unknown): Promise<QccEntityStatus> {
  const { candidates, single } = readCandidates(data);
  const status: QccEntityStatus = single ? "locked" : candidates.length ? "candidates" : "missing";
  const chosen = single ? candidates[0]! : null;
  await sql`
    UPDATE qcc_entities SET status = ${status}, name = ${chosen?.name ?? null}, credit_code = ${chosen?.creditCode ?? null},
      candidates = ${sql.json(candidates as never)}, suggested = ${single ? null : suggestCandidate(topic, candidates)},
      confirmed_by = ${single ? "qcc" : null}, last_error = NULL, updated_at = now()
    WHERE slug = ${topic.slug} AND status IN ('unresolved', 'candidates', 'missing')`;
  return status;
}

/** The admin picks a candidate (or confirms the suggestion). */
export async function confirmEntity(slug: string, creditCode: string, actor: string): Promise<EntityRow | null> {
  const [row] = await sql<EntityRow[]>`SELECT * FROM qcc_entities WHERE slug = ${slug}`;
  if (!row) return null;
  const pick = row.candidates.find((c) => c.creditCode === creditCode);
  if (!pick) throw new Error("这家公司不在候选里");
  const [after] = await sql<EntityRow[]>`
    UPDATE qcc_entities SET status = 'locked', name = ${pick.name}, credit_code = ${pick.creditCode}, confirmed_by = ${actor},
      fetched_at = NULL, overview = NULL, last_error = NULL, updated_at = now()
    WHERE slug = ${slug} RETURNING *`;
  await audit(actor, "qcc.entity.confirm", `qcc:${slug}`, null, { status: row.status, name: row.name }, { status: "locked", name: pick.name, creditCode: pick.creditCode });
  return after ?? null;
}

/** Confirms every broker waiting on candidates that has a suggestion; returns how many. */
export async function confirmSuggested(actor: string): Promise<string[]> {
  const rows = await sql<EntityRow[]>`SELECT * FROM qcc_entities WHERE status = 'candidates' AND suggested IS NOT NULL`;
  const done: string[] = [];
  for (const row of rows) if (await confirmEntity(row.slug, row.suggested!, actor)) done.push(row.slug);
  return done;
}

/** Forgets a broker's subject and data: the next visit or refresh looks it up again. */
export async function resetEntity(slug: string, actor: string): Promise<boolean> {
  const [row] = await sql<EntityRow[]>`SELECT * FROM qcc_entities WHERE slug = ${slug}`;
  if (!row) return false;
  await sql.begin(async (tx) => {
    await tx`DELETE FROM qcc_sections WHERE slug = ${slug}`;
    await tx`UPDATE qcc_entities SET status = 'unresolved', name = NULL, credit_code = NULL, candidates = '[]', suggested = NULL,
               confirmed_by = NULL, requested_at = NULL, fetched_at = NULL, overview = NULL, last_error = NULL, updated_at = now()
             WHERE slug = ${slug}`;
  });
  await audit(actor, "qcc.entity.reset", `qcc:${slug}`, null, { status: row.status, name: row.name }, { status: "unresolved" });
  return true;
}

/** A row for every broker, so each has a state to read and update. */
export async function ensureEntities(slugs: string[] = brokerTopics().map((t) => t.slug)): Promise<void> {
  if (!slugs.length) return;
  await sql`INSERT INTO qcc_entities (slug) SELECT unnest(${slugs}::text[]) ON CONFLICT (slug) DO NOTHING`;
}
