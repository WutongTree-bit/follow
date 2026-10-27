// The company group of the topics page: every broker with its headline facts from QCC, and whether it has an archive yet.
import { useMemo, useState } from "react";
import { Link } from "react-router";
import type { TopicsGroupPart } from "../../../apps/web/app/modules.ts";
import { BrandMark } from "../../../apps/web/app/components/BrandMark.tsx";
import { IconSearch } from "../../../apps/web/app/components/icons.tsx";
import type { QccBrokerSummary, QccBrokersResponse } from "../contract.ts";
import { count, money } from "./format.ts";

const ready = (b: QccBrokerSummary) => !!b.overview;

/** A broker without an archive says why in a few words, not "missing". */
const waiting = (b: QccBrokerSummary) => (b.status === "candidates" ? "工商主体待确认" : b.status === "missing" ? "企查查暂未收录" : "工商数据待接入");

function Status({ done }: { done: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium leading-[1.4] ${done ? "bg-ok-soft text-ok-ink" : "bg-bg-sunk text-ink-3"}`}>
      <span className={`size-1.5 rounded-full ${done ? "bg-ok" : "border border-ink-4"}`} aria-hidden="true" />
      {done ? "已建档" : "待建档"}
    </span>
  );
}

function BrokerCard({ b }: { b: QccBrokerSummary }) {
  const o = b.overview;
  const facts = o ? [o.legalRep && `法人 ${o.legalRep}`, money(o.capital) && `注册资本 ${money(o.capital)}`, o.stock && `${o.stock.code}`].filter(Boolean) : [];
  return (
    <li>
      <Link to={`/brokers/${b.slug}`} className="card card-hover flex h-full flex-col gap-2.5 px-4 py-3.5 transition-colors">
        <div className="flex items-start gap-3">
          <BrandMark brand={b.brand} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{b.name}</p>
            <p className="truncate text-[12px] text-ink-4">{b.registeredName ?? waiting(b)}</p>
          </div>
          <Status done={ready(b)} />
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

function BrokerList({ data }: { data: unknown }) {
  const { configured, brokers } = data as QccBrokersResponse;
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brokers
      .filter((b) => !q || [b.name, b.registeredName ?? "", b.slug, b.overview?.stock?.code ?? ""].some((s) => s.toLowerCase().includes(q)))
      // Brokers with an archive first, then the busiest in the news.
      .sort((a, b) => Number(ready(b)) - Number(ready(a)) || b.recent - a.recent);
  }, [brokers, query]);
  const done = brokers.filter(ready).length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-3">
            <span className="inline-flex items-center gap-1.5"><Status done /><span><span className="num font-semibold text-ink-2">{done}</span> 家</span></span>
            <span className="inline-flex items-center gap-1.5"><Status done={false} /><span><span className="num font-semibold text-ink-2">{brokers.length - done}</span> 家</span></span>
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-4">已建档的券商可以查看企业、法律与标讯数据；待建档的正在确认工商主体，先看相关动态。</p>
          {!configured && <p className="mt-1.5 text-[12px] text-amber-ink">企查查数据源还没有接入，档案暂时为空。</p>}
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
      </div>
      {shown.length === 0 ? (
        <p className="py-16 text-center text-[13.5px] text-ink-4">没有找到“{query}”相关的券商</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{shown.map((b) => <BrokerCard key={b.slug} b={b} />)}</ul>
      )}
    </>
  );
}

const part: TopicsGroupPart = { group: "company", api: "/api/qcc/brokers", List: BrokerList };

export default part;
