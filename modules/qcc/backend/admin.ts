// The admin's 企查查 MCP page: the servers (masked), a connection test, and each broker's subject.
import { sql } from "@aihot/backend/db";
import type { QccAdminEntity, QccAdminOverview, QccServerTest } from "../contract.ts";
import { listTools } from "./client.ts";
import { CACHE_DAYS, loadConfig, serverViews } from "./config.ts";
import { brokerTopics, ensureEntities, entityRows } from "./entities.ts";
import { pendingRuns, requestRefresh } from "./refresh.ts";

export async function adminOverview(): Promise<QccAdminOverview> {
  await ensureEntities();
  const [{ config, updatedAt, updatedBy }, rows, pending, [budget]] = await Promise.all([
    loadConfig(),
    entityRows(),
    pendingRuns(),
    sql<{ per_minute: number; per_hour: number; per_day: number; used_hour: number; used_day: number }[]>`
      SELECT b.per_minute, b.per_hour, b.per_day,
        (SELECT count(*)::int FROM receipt_attempts a WHERE a.service = 'qcc' AND a.origin = 'live' AND a.started_at > now() - interval '1 hour') AS used_hour,
        (SELECT count(*)::int FROM receipt_attempts a WHERE a.service = 'qcc' AND a.origin = 'live' AND a.started_at > now() - interval '1 day') AS used_day
      FROM budgets b WHERE b.service = 'qcc'`,
  ]);
  const entities: QccAdminEntity[] = brokerTopics().map((t) => {
    const r = rows.get(t.slug);
    return {
      slug: t.slug,
      name: t.name,
      status: r?.status ?? "unresolved",
      registeredName: r?.name ?? null,
      creditCode: r?.credit_code ?? null,
      candidates: r?.candidates ?? [],
      suggested: r?.suggested ?? null,
      confirmedBy: r?.confirmed_by ?? null,
      pending: pending.has(t.slug),
      fetchedAt: r?.fetched_at?.toISOString() ?? null,
      lastError: r?.last_error ?? null,
    };
  });
  return {
    configured: !!config,
    servers: serverViews(config),
    updatedAt: updatedAt?.toISOString() ?? null,
    updatedBy,
    cacheDays: CACHE_DAYS,
    budget: budget ? { perMinute: budget.per_minute, perHour: budget.per_hour, perDay: budget.per_day, usedHour: budget.used_hour, usedDay: budget.used_day } : null,
    entities,
  };
}

export async function testServers(): Promise<QccServerTest[]> {
  const { config } = await loadConfig();
  if (!config) throw new Error("还没有配置企查查 MCP");
  return Promise.all(config.servers.map(async (s) => {
    const r = await listTools(s);
    return { key: s.key, role: s.role, ...r, ok: !r.error && r.tools > 0 };
  }));
}

/** Queues a lookup for every broker that has not been looked up (or matched nothing). */
export async function lookUpAll(): Promise<number> {
  await ensureEntities();
  const rows = await sql<{ slug: string }[]>`SELECT slug FROM qcc_entities WHERE status IN ('unresolved', 'missing')`;
  let queued = 0;
  for (const r of rows) if (await requestRefresh(r.slug, { force: true })) queued++;
  return queued;
}
