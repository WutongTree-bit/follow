// The QCC MCP servers, as the admin pasted them ({"mcpServers": {...}}), kept in `settings` under
// `qcc.mcp`: the tokens stay in the database, never in the repository, and leave it only masked.
import { sql } from "@aihot/backend/db";
import { audit } from "@aihot/backend/audit";
import type { QccServerView } from "../contract.ts";

const KEY = "qcc.mcp";

/** How long fetched data is kept before a visit asks for it again. */
export const CACHE_DAYS = 3;

export interface QccServer {
  key: string;
  /** What it serves, from its address (/mcp/<role>/stream): company, risk, legal-case, tender … */
  role: string | null;
  url: string;
  authorization: string | null;
}

export interface QccConfig {
  servers: QccServer[];
}

/** Address segment → role; the two legal servers are named apart from their segment. */
const ROLES: Record<string, string> = {
  company: "company", risk: "risk", ipr: "ipr", operation: "operation", history: "history", executive: "executive",
  regulation: "legal-regulation", case: "legal-case", tender: "tender", document: "document",
};

export function roleOf(url: string, key: string): string | null {
  const segment = /\/mcp\/([a-z-]+)\/stream\b/.exec(url)?.[1];
  if (segment && ROLES[segment]) return ROLES[segment];
  const named = key.replace(/^qcc-/, "");
  return Object.values(ROLES).includes(named) ? named : null;
}

/** Reads the pasted JSON: the whole `{"mcpServers": …}` file, or just its object of servers. */
export function parseConfig(text: string): QccConfig {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("不是有效的 JSON"); }
  const root = raw && typeof raw === "object" && "mcpServers" in raw ? (raw as { mcpServers: unknown }).mcpServers : raw;
  if (!root || typeof root !== "object" || Array.isArray(root)) throw new Error("需要 mcpServers 对象");
  const servers: QccServer[] = [];
  for (const [key, value] of Object.entries(root as Record<string, unknown>)) {
    const v = (value ?? {}) as { url?: unknown; headers?: Record<string, unknown> };
    const url = String(v.url ?? "").trim();
    if (!/^https:\/\/[^\s/]+\/\S*$/.test(url)) throw new Error(`${key} 的 url 需要是 https 地址`);
    const header = Object.entries(v.headers ?? {}).find(([name]) => name.toLowerCase() === "authorization")?.[1];
    servers.push({ key, role: roleOf(url, key), url, authorization: typeof header === "string" && header.trim() ? header.trim() : null });
  }
  if (!servers.length) throw new Error("没有任何 MCP 服务");
  const roles = servers.map((s) => s.role).filter(Boolean);
  if (new Set(roles).size !== roles.length) throw new Error("同一类服务出现了两次");
  return { servers };
}

export function maskAuthorization(value: string | null): string {
  if (!value) return "（无）";
  const [scheme, secret] = value.includes(" ") ? [value.slice(0, value.indexOf(" ")), value.slice(value.indexOf(" ") + 1)] : ["", value];
  const shown = secret.length <= 8 ? "****" : `${secret.slice(0, 4)}****${secret.slice(-4)}`;
  return scheme ? `${scheme} ${shown}` : shown;
}

export function serverViews(config: QccConfig | null): QccServerView[] {
  return (config?.servers ?? []).map((s) => ({ key: s.key, role: s.role, url: s.url, authorization: maskAuthorization(s.authorization) }));
}

export async function loadConfig(): Promise<{ config: QccConfig | null; updatedAt: Date | null; updatedBy: string | null }> {
  const [row] = await sql<{ value: QccConfig; updated_at: Date; updated_by: string | null }[]>`
    SELECT value, updated_at, updated_by FROM settings WHERE key = ${KEY}`;
  return { config: row?.value?.servers?.length ? row.value : null, updatedAt: row?.updated_at ?? null, updatedBy: row?.updated_by ?? null };
}

export async function serverFor(role: string): Promise<QccServer | null> {
  return (await loadConfig()).config?.servers.find((s) => s.role === role) ?? null;
}

export async function saveConfig(text: string, reason: string, actor: string): Promise<QccServerView[]> {
  if (!reason?.trim()) throw new Error("reason is required");
  const next = parseConfig(text);
  const before = (await loadConfig()).config;
  await sql.begin(async (tx) => {
    await tx`INSERT INTO settings (key, value, updated_by) VALUES (${KEY}, ${tx.json(next as never)}, ${actor})
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`;
    // Each tool call is billed: the same per-minute/hour/day stop as the other paid services (settings page).
    await tx`INSERT INTO budgets (service, per_minute, per_hour, per_day, note) VALUES ('qcc', 30, 600, 3000, '企查查 MCP（按调用计费）')
             ON CONFLICT (service) DO NOTHING`;
  });
  await audit(actor, "qcc.config", "settings:qcc.mcp", reason, before ? { servers: serverViews(before) } : null, { servers: serverViews(next) });
  return serverViews(next);
}

export async function clearConfig(reason: string, actor: string): Promise<void> {
  if (!reason?.trim()) throw new Error("reason is required");
  const before = (await loadConfig()).config;
  await sql`DELETE FROM settings WHERE key = ${KEY}`;
  await audit(actor, "qcc.config.clear", "settings:qcc.mcp", reason, before ? { servers: serverViews(before) } : null, null);
}
