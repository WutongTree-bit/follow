import assert from "node:assert/strict";
import http from "node:http";
import test, { after } from "node:test";
import { config } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { getBoss, stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { readRpc, readToolResult } from "../backend/client.ts";
import { maskAuthorization, parseConfig } from "../backend/config.ts";
import { confirmEntity, readCandidates, suggestCandidate } from "../backend/entities.ts";
import { brokerPage } from "../backend/read.ts";
import { overviewOf, refreshBroker, refreshQueue, requestRefresh, type RefreshJob } from "../backend/refresh.ts";
import { server } from "../server.ts";

installModules([server]);
after(async () => {
  await stopBoss();
  await closeDb();
});
// The fake QCC server listens on loopback.
config.allowPrivateNetworkFetch = true;

/** Does what the worker does with each queued run; how many it ran. A failed run's error is thrown. */
async function work(): Promise<number> {
  const boss = await getBoss();
  let ran = 0;
  for (;;) {
    const [job] = await boss.fetch<RefreshJob>(refreshQueue.name);
    if (!job) return ran;
    ran++;
    try {
      await refreshBroker(job.data);
      await boss.complete(refreshQueue.name, job.id);
    } catch (error) {
      await boss.fail(refreshQueue.name, job.id, { message: String(error) });
      throw error;
    }
  }
}

test("the pasted mcpServers JSON is read by each server's address, and its token is only shown masked", () => {
  const config = parseConfig(JSON.stringify({ mcpServers: {
    "qcc-company": { url: "https://agent.qcc.com/mcp/company/stream", headers: { Authorization: "Bearer abcdefghijklmnop" } },
    "qcc-legal-case": { url: "https://agent.qcc.com/mcp/case/stream", headers: { authorization: "Bearer abcdefghijklmnop" } },
    "my-tender": { url: "https://agent.qcc.com/mcp/tender/stream", headers: {} },
  } }));
  assert.deepEqual(config.servers.map((s) => s.role), ["company", "legal-case", "tender"]);
  assert.equal(config.servers[2]!.authorization, null);
  assert.equal(maskAuthorization("Bearer abcdefghijklmnop"), "Bearer abcd****mnop");
  assert.throws(() => parseConfig('{"mcpServers":{"x":{"url":"http://agent.qcc.com/mcp/company/stream"}}}'), /https/);
  assert.throws(() => parseConfig("not json"), /JSON/);
});

test("an answer is read from JSON or SSE, and a no-match or isError answer is the tool's refusal", () => {
  assert.deepEqual(readRpc('event: message\ndata: {"result":{"ok":1},"jsonrpc":"2.0","id":1}\n\n'), { result: { ok: 1 }, jsonrpc: "2.0", id: 1 });
  assert.deepEqual(readToolResult({ content: [{ type: "text", text: '{"企业名称":"甲"}' }] }), { data: { 企业名称: "甲" }, error: null });
  assert.match(readToolResult({ content: [{ type: "text", text: '{"无匹配项":"未匹配到搜索关键词。"}' }] }).error!, /未匹配/);
  assert.equal(readToolResult({ isError: true, content: [{ type: "text", text: "boom" }] }).error, "boom");
});

const candidates = {
  匹配结果: "多候选",
  企业信息: [
    { 企业名称: "国泰海通证券股份有限公司", 统一社会信用代码: "9131000063159284XQ", 成立日期: "1999-08-18", 法定代表人名称: ["朱健"], 状态: "存续" },
    { 企业名称: "国泰海通期货有限公司", 统一社会信用代码: "91310000100020711J", 成立日期: "1993-02-23", 法定代表人名称: ["某某"], 状态: "存续" },
  ],
};

test("several matches wait for a person; the suggestion is the one named exactly like the broker", () => {
  const read = readCandidates(candidates);
  assert.equal(read.single, false);
  assert.equal(suggestCandidate({ name: "国泰海通", aliases: [] }, read.candidates), "9131000063159284XQ");
  // A subsidiary is never suggested, nor a name that only starts the same way.
  assert.equal(suggestCandidate({ name: "国泰海通期货证券", aliases: [] }, read.candidates), null);
  assert.equal(readCandidates({ 匹配结果: "唯一", 企业信息: [candidates.企业信息[0]] }).single, true);
});

test("the overview reads the registration, listing, risk scan and tender profile", () => {
  const o = overviewOf([
    { key: "registration", title: "", view: "fields", ok: true, data: { 法定代表人: "张三", 注册资本: "100万元", 成立日期: "2000-01-01", 登记状态: "存续（在营、开业、在册）" } },
    { key: "listing", title: "", view: "fields", ok: true, data: { 股票代码: "600030", 股票简称: "中信证券", 上市交易所: "上海证券交易所", 总市值: "4000亿" } },
    { key: "risk", title: "", view: "risk", ok: true, data: { 有记录因子数: 2, 风险因子扫描: [{ 风险因子: "裁判文书", 条目数: 5 }, { 风险因子: "失信信息", 条目数: 0 }] } },
    { key: "profile", title: "", view: "tenderProfile", ok: true, data: { 中标数: "12", 相关标讯数: "30" } },
  ]);
  assert.equal(o.state, "存续");
  assert.deepEqual(o.stock, { code: "600030", name: "中信证券", exchange: "上海证券交易所", marketCap: "4000亿" });
  assert.equal(o.riskHits, 2);
  assert.equal(o.judgments, 5);
  assert.equal(o.wins, 12);
});

test("a visit queues the lookup; after the admin confirms a candidate the worker fills all three tabs", async () => {
  const calls: string[] = [];
  const fake = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const { params } = JSON.parse(body) as { params: { name: string; arguments: Record<string, unknown> } };
      calls.push(params.name);
      const answers: Record<string, unknown> = {
        get_company_by_query: candidates,
        get_company_registration_info: { 企业名称: "国泰海通证券股份有限公司", 法定代表人: "朱健", 注册资本: "1763091.8545万元" },
        get_company_risk_scan: { 有记录因子数: 1, 风险因子扫描: [{ 风险因子: "裁判文书", 条目数: 3 }] },
        search_companies: { 企业列表: [{ 企业ID: "eid-1", 企业名称: "国泰海通证券股份有限公司", 统一社会信用代码: "9131000063159284XQ", 中标数: "7" }] },
        search_company_tenders: { 标讯列表: [{ 标讯ID: "t1", 标题: "债券承销项目中标公告" }] },
        get_judicial_case_search: { 案例列表: [{ 案例ID: "c1", 案件标题: "某纠纷一审判决书" }] },
      };
      const text = JSON.stringify(answers[params.name] ?? { 摘要: "无记录" });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text }] } })}\n\n`);
    });
  });
  await new Promise<void>((resolve) => fake.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(fake.address() as { port: number }).port}`;
  try {
    const roles = ["company", "risk", "operation", "regulation", "case", "tender"];
    const servers = roles.map((r) => ({ key: `qcc-${r}`, role: r === "regulation" ? "legal-regulation" : r === "case" ? "legal-case" : r, url: `${base}/mcp/${r}/stream`, authorization: "Bearer test" }));
    await sql`INSERT INTO settings (key, value, updated_by) VALUES ('qcc.mcp', ${sql.json({ servers } as never)}, 'test')`;

    const first = await brokerPage("gtht");
    assert.ok(first);
    assert.equal(first.configured, true);
    assert.equal(first.refreshing, true, "a visit asks the worker for the lookup");
    assert.equal((await brokerPage("gtht"))!.refreshing, true, "a second visit finds the queued run");
    assert.equal(await work(), 1, "and does not queue another");
    const [row] = await sql<{ status: string; suggested: string }[]>`SELECT status, suggested FROM qcc_entities WHERE slug = 'gtht'`;
    assert.deepEqual({ ...row }, { status: "candidates", suggested: "9131000063159284XQ" }, "two matches: the admin picks");
    assert.deepEqual(calls, ["get_company_by_query"]);
    assert.equal((await brokerPage("gtht"))!.refreshing, false, "waiting on the admin is not refreshing");

    // A spent budget stops the run midway; the next run reuses what it paid for instead of buying it again.
    await sql`INSERT INTO budgets (service, per_minute, per_hour, per_day, note) VALUES ('qcc', 3, 600, 3000, 'test') ON CONFLICT (service) DO UPDATE SET per_minute = 3`;
    await confirmEntity("gtht", "9131000063159284XQ", "admin@test");
    await requestRefresh("gtht", { force: true });
    await assert.rejects(work(), /Budget for qcc exhausted/);
    assert.equal(calls.length, 3, "the lookup and two blocks, then the budget refuses");
    await sql`UPDATE budgets SET per_minute = 100 WHERE service = 'qcc'`;
    await sql`DELETE FROM pgboss.job WHERE name = 'qcc.refresh'`;
    assert.equal(await requestRefresh("gtht", { force: true }), true);
    assert.equal(await work(), 1);
    const fetched = calls.slice(1);
    assert.equal(new Set(fetched).size, fetched.length, `no tool was paid for twice: ${fetched.join(",")}`);

    const page = await brokerPage("gtht");
    assert.equal(page!.broker.registeredName, "国泰海通证券股份有限公司");
    assert.equal(page!.broker.overview?.legalRep, "朱健");
    assert.equal(page!.broker.overview?.wins, 7);
    assert.equal(page!.refreshing, false, "fresh data is not asked for again");
    assert.ok(page!.tabs.company.blocks.find((b) => b.key === "registration")?.ok);
    assert.deepEqual(Object.keys(page!.tabs.company.blocks.find((b) => b.key === "registration")!.data as object), ["企业名称", "法定代表人", "注册资本"], "fields keep QCC's order");
    assert.ok(page!.tabs.legal.blocks.find((b) => b.key === "cases")?.ok);
    assert.deepEqual(page!.tabs.tender.blocks.map((b) => [b.key, b.ok]), [["profile", true], ["tenders", true]]);
    const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM receipts WHERE service = 'qcc'`;
    assert.equal(n, calls.length, "every call went through a receipt of the qcc budget");
  } finally {
    fake.close();
  }
});
