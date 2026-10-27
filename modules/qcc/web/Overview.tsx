// The headline facts of a broker (contract.ts QccOverview), as tiles.
import type { QccOverview } from "../contract.ts";
import { count, money } from "./format.ts";

export function overviewTiles(o: QccOverview): Array<{ label: string; value: string; hint?: string; tone?: "hot" | "ok" }> {
  const tiles: Array<{ label: string; value: string; hint?: string; tone?: "hot" | "ok" }> = [
    { label: "法定代表人", value: o.legalRep ?? "—" },
    { label: "注册资本", value: money(o.capital) ?? "—" },
    { label: "成立日期", value: o.founded ?? "—" },
  ];
  if (o.stock) tiles.push({ label: "上市", value: `${o.stock.name ?? ""} ${o.stock.code}`.trim(), hint: [o.stock.exchange?.replace("证券交易所", "所"), o.stock.marketCap && `市值 ${o.stock.marketCap}`].filter(Boolean).join(" · ") });
  else tiles.push({ label: "企业类型", value: o.companyType ?? "—" });
  if (o.riskHits !== null) tiles.push({ label: "风险因子", value: `${count(o.riskHits)} 项有记录`, hint: o.riskTotal ? `共扫描 ${o.riskTotal} 项` : undefined, tone: o.riskHits ? "hot" : "ok" });
  if (o.wins !== null) tiles.push({ label: "中标", value: `${count(o.wins)} 次`, hint: o.tenders !== null ? `相关标讯 ${count(o.tenders)} 条` : undefined });
  return tiles;
}

export function OverviewTiles({ overview, compact = false }: { overview: QccOverview; compact?: boolean }) {
  const tiles = overviewTiles(overview);
  return (
    <dl className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"}`}>
      {tiles.map((t) => (
        <div key={t.label} className="min-w-0 rounded-control bg-bg-sunk px-3 py-2.5">
          <dt className="text-[12px] text-ink-4">{t.label}</dt>
          <dd className={`mt-0.5 truncate text-[14.5px] font-semibold ${t.tone === "hot" ? "text-hot" : t.tone === "ok" ? "text-ok" : "text-ink"}`} title={t.value}>{t.value}</dd>
          {t.hint && <dd className="mt-0.5 truncate text-[11.5px] text-ink-4">{t.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
