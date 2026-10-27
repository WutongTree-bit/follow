// Streamable-HTTP MCP calls to QCC. The servers answer a lone JSON-RPC request without a session, as JSON or
// as one SSE `message` event. Tool calls are billed: each goes through receipts and the `qcc` budget, and
// the answer is saved before it is used. Listing the tools (the admin's connection test) is free.
import { guardedFetch } from "@aihot/backend/lib/http-fetch";
import { assertAccepted, paidRequest, ProviderRejectedError } from "@aihot/backend/providers/receipts";
import type { QccServer } from "./config.ts";

/** What QCC tells a caller who named a company it cannot match (its 路径 ③). */
export const NO_MATCH = "未匹配到搜索关键词";

/** A tool's answer: its JSON (Chinese keys) when it is JSON, else its text. `error` is the tool's own refusal. */
export interface ToolAnswer {
  data: unknown;
  error: string | null;
}

/** One JSON-RPC message from a body that is JSON or SSE. */
export function readRpc(text: string): { result?: unknown; error?: { code?: number; message?: string } } {
  const events = text.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());
  const body = events.length ? events.join("") : text.trim();
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`QCC 返回了无法解析的内容：${body.slice(0, 200)}`);
  }
}

/** A tools/call result: its text as JSON when possible; isError, or a 无匹配项-only answer, as the error. */
export function readToolResult(result: unknown): ToolAnswer {
  const r = (result ?? {}) as { content?: Array<{ type?: string; text?: string }>; structuredContent?: unknown; isError?: boolean };
  const text = (r.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").trim();
  let data: unknown = r.structuredContent ?? null;
  if (data === null && text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (r.isError) return { data: null, error: (typeof data === "string" ? data : text) || "工具调用失败" };
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === "无匹配项") return { data: null, error: String((data as Record<string, unknown>)["无匹配项"]) };
  }
  return { data, error: null };
}

async function post(server: QccServer, body: object, timeoutMs: number) {
  if (!server.authorization) throw new ProviderRejectedError(`qcc: ${server.key} 没有配置 Authorization`, null, false, true);
  const res = await guardedFetch(server.url, {
    method: "POST",
    route: "direct",
    redirectPolicy: "same-origin",
    timeoutMs,
    maxBytes: 4 * 1024 * 1024,
    headers: { authorization: server.authorization, accept: "application/json, text/event-stream", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = res.text();
  assertAccepted("qcc", res.status, text);
  return readRpc(text);
}

/**
 * Calls one tool once per `identity` (receipts): a job retried with the same identity reuses the saved answer.
 * A JSON-RPC error (an unknown tool, a server the account may not use) is a refusal the provider did not bill.
 */
export async function callTool(server: QccServer, tool: string, args: Record<string, unknown>, opts: { subject: string; identity: unknown }): Promise<ToolAnswer> {
  const receipt = await paidRequest(
    { service: "qcc", model: server.role, purpose: `qcc.${tool}`, subject: opts.subject, identity: { url: server.url, tool, args, at: opts.identity }, requestSummary: { server: server.key, tool, args } },
    async () => {
      const rpc = await post(server, { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: args } }, 45_000);
      if (rpc.error) throw new ProviderRejectedError(`qcc ${tool}: ${rpc.error.message ?? "error"} (${rpc.error.code ?? "?"})`, null, false);
      return { response: rpc.result ?? null };
    },
  );
  return readToolResult(receipt.response);
}

/** The admin's connection test: lists a server's tools (free), timing the round trip. */
export async function listTools(server: QccServer): Promise<{ tools: number; error: string | null; ms: number }> {
  const started = performance.now();
  try {
    const rpc = await post(server, { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }, 20_000);
    const ms = Math.round(performance.now() - started);
    if (rpc.error) return { tools: 0, error: rpc.error.message ?? `错误 ${rpc.error.code}`, ms };
    return { tools: ((rpc.result as { tools?: unknown[] })?.tools ?? []).length, error: null, ms };
  } catch (error) {
    return { tools: 0, error: (error as Error).message.slice(0, 300), ms: Math.round(performance.now() - started) };
  }
}
