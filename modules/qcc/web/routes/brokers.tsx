// /brokers — every broker with its headline facts from QCC; pick one for its full 券商档案.
import { useMemo, useState } from "react";
import { Link, useLoaderData } from "react-router";
import { SITE } from "@aihot/site";
import type { QccBrokerSummary, QccBrokersResponse } from "../../contract.ts";
import { apiGet, cachedPage } from "../../../../apps/web/app/lib/api.server.ts";
import { pageReuse } from "../../../../apps/web/app/lib/page-reuse.ts";
import { pageMeta } from "../../../../apps/web/app/lib/seo.ts";
import { PillTabs } from "../../../../apps/web/app/components/ui/Tabs.tsx";
import { BrandMark } from "../../../../apps/web/app/components/BrandMark.tsx";
import { PhoneBar } from "../../../../apps/web/app/components/shell/PhoneBar.tsx";
import { IconSearch } from "../../../../apps/web/app/components/icons.tsx";
import type { Screen } from "../../../../apps/web/app/components/shell/screens.ts";
import { count, money } from "../format.ts";

export const handle: Screen = { tab: "me", name: "券商档案" };
export { pageHeaders as headers } from "../../../../apps/web/app/lib/api.server.ts";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

export async function loader({ request }: { request: Request }) {
  return cachedPage(60, { data: await apiGet<QccBrokersResponse>("/api/qcc/brokers", { signal: request.signal }) });
}

export function meta() {
  return pageMeta({
    title: "券商档案：证券公司工商、法律与标讯数据",
    description: `国内证券公司的工商登记、股东高管、风险扫描、司法案例与招投标数据，来自企查查，${SITE.name}整理。`,
    path: "/brokers",
  });
}

type Filter = "all" | "ready" | "pending";

function BrokerCard({ b }: { b: QccBrokerSummary }) {
  const o = b.overview;
  const facts = o ? [o.legalRep && `法人 ${o.legalRep}`, money(o.capital) && `注册资本 ${money(o.capital)}`, o.stock && `${o.stock.code}`].filter(Boolean) : [];
  return (
    <li>
      <Link to={`/brokers/${b.slug}`} className="card card-hover flex h-full flex-col gap-2.5 px-4 py-3.5 transition-colors">
        <div className="flex items-center gap-3">
          <BrandMark brand={b.brand} size={32} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">{b.name}</p>
            <p className="truncate text-[12px] text-ink-4">{b.registeredName ?? (b.status === "candidates" ? "待确认工商主体" : b.status === "missing" ? "企查查未收录" : "尚未建档")}</p>
          </div>
        </div>
        {facts.length > 0 && <p className="truncate text-[12.5px] text-ink-3">{facts.join(" · ")}</p>}
        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-4">
          {o?.riskHits != null && <span>风险因子 <span className={`num font-semibold ${o.riskHits ? "text-hot" : "text-ok"}`}>{o.riskHits}</span> 项</span>}
          {o?.wins != null && <span>中标 <span className="num font-semibold text-ink-2">{count(o.wins)}</span></span>}
          <span>近 30 天动态 <span className="num font-semibold text-ink-2">{b.recent}</span></span>
        </div>
      </Link>
    </li>
  );
}

export default function BrokersRoute() {
  const { data } = useLoaderData<typeof loader>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const ready = (b: QccBrokerSummary) => !!b.overview;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.brokers
      .filter((b) => filter === "all" || (filter === "ready" ? ready(b) : !ready(b)))
      .filter((b) => !q || [b.name, b.registeredName ?? "", b.slug, b.overview?.stock?.code ?? ""].some((s) => s.toLowerCase().includes(q)))
      // Brokers with data first, then the busiest in the news.
      .sort((a, b) => Number(ready(b)) - Number(ready(a)) || b.recent - a.recent);
  }, [data.brokers, query, filter]);
  const readyCount = data.brokers.filter(ready).length;

  return (
    <div className="pb-10">
      <PhoneBar back={{ to: "/more", label: "我的" }} title="券商档案" />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-5 pt-3 lg:pt-1">
        <div className="max-w-[720px]">
          <h1 data-page-title="" className="text-[24px] font-bold leading-[1.3] text-ink lg:text-[26px]">券商档案</h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
            {data.brokers.length} 家证券公司的企业数据、法律数据和标讯数据，来自企查查。选一家券商查看工商登记、股东高管、风险扫描、司法案例和招投标记录。
          </p>
          {!data.configured && <p className="mt-2 text-[12.5px] text-amber-ink">企查查数据源还没有接入，档案暂时为空。</p>}
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">搜索券商</span>
          <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="券商名称、全称或股票代码"
            className="h-10 w-full rounded-full border border-line bg-surface pl-9 pr-4 text-[14px] text-ink outline-none placeholder:text-ink-4 focus:border-accent"
          />
        </label>
      </header>
      <PillTabs
        layoutId="qcc-filter"
        label="筛选"
        size="sm"
        className="mb-4"
        active={filter}
        onSelect={(k) => setFilter(k as Filter)}
        items={[
          { key: "all", label: "全部", count: data.brokers.length },
          { key: "ready", label: "已建档", count: readyCount },
          { key: "pending", label: "待建档", count: data.brokers.length - readyCount },
        ]}
      />
      {shown.length === 0 ? (
        <p className="py-16 text-center text-[13.5px] text-ink-4">没有找到“{query}”相关的券商</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{shown.map((b) => <BrokerCard key={b.slug} b={b} />)}</ul>
      )}
    </div>
  );
}
