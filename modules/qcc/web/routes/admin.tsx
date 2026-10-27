// /admin/qcc — 企查查 MCP: the servers (pasted as the mcpServers JSON), a connection test, and which
// registered company each broker is (QCC asks a person to pick when several match).
import { useMemo, useState } from "react";
import { Link, useLoaderData } from "react-router";
import { SITE } from "@aihot/site";
import type { QccAdminEntity, QccAdminOverview, QccEntityStatus, QccServerTest } from "../../contract.ts";
import { adminGet } from "../../../../apps/web/app/lib/admin.server.ts";
import { useAdminAction } from "../../../../apps/web/app/features/admin/action.ts";
import { bj } from "../../../../apps/web/app/features/admin/format.ts";
import { AdminPage, Badge, Button, Card, DataTable, Input, ReasonDialog, Select, Textarea } from "../../../../apps/web/app/features/admin/ui.tsx";

export async function loader({ request }: { request: Request }) {
  return adminGet<QccAdminOverview>(request, "/api/admin/qcc");
}

export const meta = () => [{ title: `企查查 MCP · ${SITE.name} 后台` }];

const STATUS: Record<QccEntityStatus, { label: string; tone: "ok" | "warn" | "bad" | "muted" }> = {
  locked: { label: "已确认", tone: "ok" },
  candidates: { label: "待选择", tone: "warn" },
  missing: { label: "未匹配", tone: "bad" },
  unresolved: { label: "未识别", tone: "muted" },
};

const EXAMPLE = `{
  "mcpServers": {
    "qcc-company": {
      "url": "https://agent.qcc.com/mcp/company/stream",
      "headers": { "Authorization": "Bearer <你的 API Key>" }
    }
  }
}`;

function ConfigCard({ o }: { o: QccAdminOverview }) {
  const { run, pending } = useAdminAction();
  const [json, setJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [tests, setTests] = useState<QccServerTest[] | null>(null);
  const testOf = (key: string) => tests?.find((t) => t.key === key);
  return (
    <Card
      title="MCP 服务"
      right={o.updatedAt ? <span>{o.updatedBy} 更新于 {bj(o.updatedAt)}</span> : <span>未配置</span>}
      pad={false}
    >
      {o.servers.length > 0 && (
        <DataTable
          rows={o.servers}
          rowKey={(s) => s.key}
          columns={[
            { key: "k", label: "服务", render: (s) => <div><div className="font-medium text-ink">{s.key}</div><div className="font-mono text-[11.5px] text-ink-4">{s.role ?? "未识别用途"}</div></div> },
            { key: "u", label: "地址", render: (s) => <span className="break-all font-mono text-[12px]">{s.url}</span> },
            { key: "a", label: "Authorization", render: (s) => <span className="font-mono text-[12px] text-ink-3">{s.authorization}</span> },
            {
              key: "t", label: "连通", align: "right", render: (s) => {
                const t = testOf(s.key);
                if (!t) return <span className="text-ink-4">—</span>;
                return t.ok ? <Badge tone="ok">{t.tools} 个工具 · {t.ms}ms</Badge> : <Badge tone="bad" title={t.error ?? ""}>{(t.error ?? "失败").slice(0, 24)}</Badge>;
              },
            },
          ]}
        />
      )}
      <div className="space-y-3 border-t border-line px-4 py-4">
        <p className="text-[12.5px] leading-relaxed text-ink-3">
          粘贴企查查控制台（agent.qcc.com → API Key）复制的 <span className="font-mono">mcpServers</span> 配置，保存后整体替换现有配置。
          令牌只存在数据库里，页面上只显示掩码。每次工具调用都按“付费请求上限”里的 <span className="font-mono">qcc</span> 额度计数。
        </p>
        <Textarea rows={8} className="font-mono text-[12px]" placeholder={EXAMPLE} value={json} onChange={(e) => setJson(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button tone="primary" disabled={!json.trim()} onClick={() => setSaving(true)}>保存配置</Button>
          <Button disabled={!o.configured} busy={pending === "test"} onClick={async () => {
            const r = await run<{ servers: QccServerTest[] }>("POST", "/api/admin/qcc/test", undefined, { label: "test", revalidate: false });
            if (r) setTests(r.servers);
          }}>测试连接</Button>
          {o.configured && <Button tone="danger" onClick={() => setClearing(true)}>清除配置</Button>}
        </div>
      </div>
      <ReasonDialog
        open={saving}
        title="保存企查查 MCP 配置"
        description="新的配置会替换现有的全部服务；之后的数据拉取都用它。"
        confirmLabel="保存"
        busy={pending === "save"}
        onClose={() => setSaving(false)}
        onSubmit={async (reason) => {
          const ok = (await run("PUT", "/api/admin/qcc/config", { json, reason }, { label: "save", success: "配置已保存" })) !== null;
          if (ok) setJson("");
          return ok;
        }}
      />
      <ReasonDialog
        open={clearing}
        title="清除企查查 MCP 配置"
        description="清除后不再拉取新数据，已拉到的数据仍然显示。"
        danger
        confirmLabel="清除"
        busy={pending === "clear"}
        onClose={() => setClearing(false)}
        onSubmit={async (reason) => (await run("DELETE", "/api/admin/qcc/config", { reason }, { label: "clear", success: "配置已清除" })) !== null}
      />
    </Card>
  );
}

function EntityActions({ e }: { e: QccAdminEntity }) {
  const { run, pending } = useAdminAction();
  const [pick, setPick] = useState(e.suggested ?? e.candidates[0]?.creditCode ?? "");
  const base = `/api/admin/qcc/brokers/${encodeURIComponent(e.slug)}`;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {e.status === "candidates" && (
        <>
          <Select className="!w-auto max-w-[260px] !py-1 text-[12.5px]" value={pick} onChange={(ev) => setPick(ev.target.value)}>
            {e.candidates.map((c) => (
              <option key={c.creditCode} value={c.creditCode}>{c.creditCode === e.suggested ? "★ " : ""}{c.name}（{c.legalRep ?? "—"} · {c.founded ?? "—"}）</option>
            ))}
          </Select>
          <Button size="sm" tone="primary" disabled={!pick} busy={pending === `confirm-${e.slug}`}
            onClick={() => run("POST", `${base}/confirm`, { creditCode: pick }, { label: `confirm-${e.slug}`, success: `${e.name} 已确认，正在拉取数据` })}>确认</Button>
        </>
      )}
      {(e.status === "locked" || e.status === "missing" || e.status === "unresolved") && (
        <Button size="sm" busy={pending === `refresh-${e.slug}`}
          onClick={() => run("POST", `${base}/refresh`, undefined, { label: `refresh-${e.slug}`, success: e.status === "locked" ? "已排队刷新" : "已排队识别" })}>
          {e.status === "locked" ? "刷新数据" : "识别"}
        </Button>
      )}
      {e.status !== "unresolved" && (
        <Button size="sm" tone="ghost" busy={pending === `reset-${e.slug}`}
          onClick={() => run("POST", `${base}/reset`, undefined, { label: `reset-${e.slug}`, success: "已重置" })}>重置</Button>
      )}
    </div>
  );
}

export default function QccAdmin() {
  const o = useLoaderData<typeof loader>();
  const { run, pending } = useAdminAction();
  const [status, setStatus] = useState<QccEntityStatus | "all">("all");
  const [q, setQ] = useState("");
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: o.entities.length };
    for (const e of o.entities) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  }, [o.entities]);
  const suggested = o.entities.filter((e) => e.status === "candidates" && e.suggested).length;
  const rows = o.entities.filter((e) => (status === "all" || e.status === status) && (!q || `${e.name}${e.registeredName ?? ""}${e.slug}`.includes(q)));

  return (
    <AdminPage
      title="企查查 MCP"
      subtitle={`券商档案的数据源，列在“主题”页的“券商公司”里。读者打开某家券商时，数据缺失或超过 ${o.cacheDays} 天才会排队重新拉取；工商主体需要先确认。`}
      actions={<Link to="/topics" className="text-[13px] text-accent hover:underline">查看券商公司 →</Link>}
    >
      <ConfigCard o={o} />

      <Card className="mt-5" title="调用额度" right={<Link to="/admin/settings" className="text-accent hover:underline">在设置里调整</Link>}>
        {o.budget ? (
          <p className="text-[13px] text-ink-2">
            每分钟 <b className="num">{o.budget.perMinute}</b> · 每小时 <b className="num">{o.budget.perHour}</b> · 每天 <b className="num">{o.budget.perDay}</b> 次；
            已用：近 1 小时 <b className="num">{o.budget.usedHour}</b>，近 24 小时 <b className="num">{o.budget.usedDay}</b>。一家券商完整刷新约 15 次调用。
          </p>
        ) : <p className="text-[13px] text-ink-3">保存配置后会自动创建 qcc 的调用上限（每分钟 30、每小时 600、每天 3000 次）。</p>}
      </Card>

      <Card
        className="mt-5"
        title="券商工商主体"
        pad={false}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={!o.configured} busy={pending === "lookup"}
              onClick={() => run<{ queued: number }>("POST", "/api/admin/qcc/lookup", undefined, { label: "lookup", success: "已排队识别未建档的券商" })}>识别全部未建档</Button>
            <Button size="sm" tone="primary" disabled={!suggested} busy={pending === "suggested"}
              onClick={() => run("POST", "/api/admin/qcc/confirm-suggested", undefined, { label: "suggested", success: "已确认建议的主体，正在拉取数据" })}>确认全部建议（{suggested}）</Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          {(["all", "locked", "candidates", "unresolved", "missing"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1 text-[12.5px] ${status === s ? "bg-ink text-bg" : "bg-surface text-ink-3 ring-1 ring-line hover:text-ink"}`}>
              {s === "all" ? "全部" : STATUS[s].label} <span className="num opacity-70">{counts[s] ?? 0}</span>
            </button>
          ))}
          <Input className="ml-auto !w-48 !py-1" placeholder="搜索券商" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p className="px-4 pt-3 text-[12px] leading-relaxed text-ink-4">
          企查查要求：名称匹配到多家公司时由人选择，不能自动取第一个。“★”是名称正好等于券商名加公司形式的建议项，确认前请核对法定代表人和成立日期。
        </p>
        <DataTable
          rows={rows}
          rowKey={(e) => e.slug}
          columns={[
            { key: "n", label: "券商", render: (e) => <div><Link to={`/brokers/${e.slug}`} className="font-medium text-ink hover:text-accent">{e.name}</Link><div className="font-mono text-[11.5px] text-ink-4">{e.slug}</div></div> },
            { key: "s", label: "状态", render: (e) => <div className="space-y-1"><Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge>{e.pending && <div className="text-[11.5px] text-accent">拉取中…</div>}</div> },
            {
              key: "r", label: "工商主体", render: (e) => e.registeredName
                ? <div><div className="text-ink-2">{e.registeredName}</div><div className="font-mono text-[11.5px] text-ink-4">{e.creditCode}{e.confirmedBy ? ` · ${e.confirmedBy === "qcc" ? "企查查唯一匹配" : `${e.confirmedBy} 确认`}` : ""}</div></div>
                : e.status === "candidates" ? <span className="text-[12.5px] text-ink-3">{e.candidates.length} 个候选</span> : <span className="text-ink-4">—</span>,
            },
            { key: "f", label: "数据", render: (e) => <div className="text-[12.5px]">{e.fetchedAt ? bj(e.fetchedAt) : <span className="text-ink-4">未拉取</span>}{e.lastError && <div className="max-w-[240px] text-[11.5px] text-hot" title={e.lastError}>{e.lastError.slice(0, 60)}</div>}</div> },
            { key: "a", label: "", align: "right", render: (e) => <EntityActions key={`${e.slug}-${e.status}-${e.suggested}`} e={e} /> },
          ]}
        />
      </Card>
    </AdminPage>
  );
}
