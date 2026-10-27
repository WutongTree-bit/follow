// /brokers/:slug — one broker's 企业数据, 法律数据 and 标讯数据 from QCC, a tab each (?tab=).
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { SITE } from "@aihot/site";
import { QCC_TABS, type QccBrokerPage, type QccTab } from "../../contract.ts";
import { cachedPage, loadOr404 } from "../../../../apps/web/app/lib/api.server.ts";
import { pageReuse } from "../../../../apps/web/app/lib/page-reuse.ts";
import { breadcrumbLd, pageMeta, titled } from "../../../../apps/web/app/lib/seo.ts";
import { AsideCard, EmptyState, ReadingLayout } from "../../../../apps/web/app/components/ui/Page.tsx";
import { PillTabs } from "../../../../apps/web/app/components/ui/Tabs.tsx";
import { BrandMark } from "../../../../apps/web/app/components/BrandMark.tsx";
import { PhoneBar } from "../../../../apps/web/app/components/shell/PhoneBar.tsx";
import { IconArrowLeft, IconChevronRight } from "../../../../apps/web/app/components/icons.tsx";
import type { Screen } from "../../../../apps/web/app/components/shell/screens.ts";
import { fullDateTime } from "../../../../apps/web/app/lib/format.ts";
import { Block } from "../blocks.tsx";
import { OverviewTiles } from "../Overview.tsx";
import { QCC_SCOPE, stateTone, tag } from "../palette.ts";

export const handle: Screen = { home: "me" };
export { pageHeaders as headers } from "../../../../apps/web/app/lib/api.server.ts";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

export async function loader({ params, request }: { params: { slug?: string }; request: Request }) {
  const slug = params.slug ?? "";
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) throw new Response("Not found", { status: 404 });
  const upstream = new Headers();
  const data = await loadOr404<QccBrokerPage>(`/api/qcc/brokers/${slug}`, { signal: request.signal, responseHeaders: upstream });
  return cachedPage(60, { data }, upstream);
}

export function meta({ loaderData }: { loaderData?: { data: QccBrokerPage } }) {
  if (!loaderData) return [{ title: titled("券商不存在") }, { name: "robots", content: "noindex" }];
  const { broker } = loaderData.data;
  const path = `/brokers/${broker.slug}`;
  return pageMeta({
    title: `${broker.name}工商档案：企业、法律与标讯数据`,
    description: `${broker.registeredName ?? broker.name}的工商登记、股东高管、风险扫描、司法案例与招投标数据，来自企查查，${SITE.name}整理。`,
    path,
    jsonLd: [breadcrumbLd([{ name: SITE.name, path: "/" }, { name: "券商档案", path: "/brokers" }, { name: broker.name, path }])],
  });
}

const POLL_MS = 4000;
const MAX_POLLS = 45;

/** While the worker fetches, ask again every few seconds until it is done. */
function useLive(initial: QccBrokerPage): QccBrokerPage {
  const [live, setLive] = useState(initial);
  useEffect(() => setLive(initial), [initial]);
  useEffect(() => {
    if (!live.refreshing) return;
    let polls = 0;
    let stop = false;
    const tick = async () => {
      if (stop || ++polls > MAX_POLLS) return;
      try {
        const res = await fetch(`/api/qcc/brokers/${initial.broker.slug}`, { headers: { accept: "application/json" }, cache: "no-store" });
        if (res.ok) {
          const next = (await res.json()) as QccBrokerPage;
          if (stop) return;
          setLive(next);
          if (!next.refreshing) return;
        }
      } catch {
        // offline for a moment: try again on the next tick
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    };
    let timer = setTimeout(tick, POLL_MS);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [live.refreshing, initial.broker.slug]);
  return live;
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card space-y-3 px-5 py-4">
          <div className="h-4 w-28 animate-pulse rounded-mark bg-bg-sunk" />
          <div className="h-3 w-full animate-pulse rounded-mark bg-bg-sunk" />
          <div className="h-3 w-4/5 animate-pulse rounded-mark bg-bg-sunk" />
        </div>
      ))}
    </div>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return <EmptyState title={title}>{children}</EmptyState>;
}

function Status({ page }: { page: QccBrokerPage }) {
  const { broker } = page;
  if (!page.configured) return <Notice title="企查查数据还没有接入">站点管理员在后台配置企查查 MCP 之后，这里会显示{broker.name}的企业、法律与标讯数据。</Notice>;
  if (broker.status === "candidates") return <Notice title="正在确认工商主体">企查查里有多家公司与“{broker.name}”同名或相近，管理员确认是哪一家之后会显示它的数据。</Notice>;
  if (broker.status === "missing") return <Notice title="企查查里没有找到这家公司">名称可能已经变更，管理员核对之后会更新。</Notice>;
  if (page.refreshing) return (
    <>
      <p className="mb-4 flex items-center gap-2 text-[13px] text-ink-3">
        <span className="size-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
        正在从企查查获取{broker.name}的数据，通常需要十几秒……
      </p>
      <Skeleton />
    </>
  );
  return <Notice title="暂时没有数据">这次没有从企查查拿到数据，稍后再来看看。</Notice>;
}

export default function BrokerRoute() {
  const { data } = useLoaderData<typeof loader>();
  const page = useLive(data);
  const { broker } = page;
  const [params] = useSearchParams();
  const asked = params.get("tab");
  const active: QccTab = QCC_TABS.some((t) => t.key === asked) ? (asked as QccTab) : "company";
  const tab = page.tabs[active];
  const hasData = QCC_TABS.some((t) => page.tabs[t.key].blocks.length);
  const fetchedAt = broker.fetchedAt;

  const aside = (
    <>
      <AsideCard title="档案信息">
        <dl className="space-y-2.5 text-[13px]">
          {page.creditCode && <div><dt className="text-[12px] text-ink-4">统一社会信用代码</dt><dd className="mono mt-0.5 text-ink-2">{page.creditCode}</dd></div>}
          <div><dt className="text-[12px] text-ink-4">数据来源</dt><dd className="mt-0.5 text-ink-2">企查查（MCP 接口）</dd></div>
          {fetchedAt && <div><dt className="text-[12px] text-ink-4">更新于</dt><dd className="num mt-0.5 text-ink-2">{fullDateTime(fetchedAt)}{page.refreshing && <span className="ml-2 text-accent">更新中…</span>}</dd></div>}
        </dl>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-4">数据每 {page.cacheDays} 天更新一次，仅供参考，以登记机关、法院和交易所的公示为准。</p>
      </AsideCard>
      {hasData && (
        <AsideCard title={QCC_TABS.find((t) => t.key === active)!.label} className="hidden lg:block">
          <nav className="-mx-2 -mb-1" aria-label="本页内容">
            {tab.blocks.map((b) => (
              <a key={b.key} href={`#b-${b.key}`} className="flex items-center justify-between rounded-control px-2 py-1.5 text-[13.5px] text-ink-2 transition-colors hover:bg-bg-sunk hover:text-ink">
                {b.title}
                {!b.ok && <span className="text-[11.5px] text-ink-4">无数据</span>}
              </a>
            ))}
          </nav>
        </AsideCard>
      )}
      <AsideCard title="相关动态">
        <p className="text-[13px] leading-[1.75] text-ink-3">近 30 天精选 <span className="num font-semibold text-ink-2">{broker.recent}</span> 条{broker.name}的新闻。</p>
        <Link to={`/topics/${broker.slug}`} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
          看最新动态 <IconChevronRight size={14} />
        </Link>
      </AsideCard>
    </>
  );

  return (
    <>
      <PhoneBar back={{ to: "/brokers", label: "券商档案" }} title={broker.name} />
      <ReadingLayout aside={aside}>
        <Link to="/brokers" className="hidden items-center gap-1.5 py-2 text-[13px] text-ink-3 transition-colors hover:text-accent lg:inline-flex">
          <IconArrowLeft size={14} /> 返回券商档案
        </Link>
        <div className={QCC_SCOPE}>
          <header className="pb-5 pt-3 lg:pt-1">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-accent">券商档案</p>
            <h1 data-page-title="" className="mt-1.5 flex items-center gap-3 text-[24px] font-bold leading-[1.3] text-ink lg:text-[26px]">
              <BrandMark brand={broker.brand} size={34} />
              <span>{broker.name}</span>
            </h1>
            {broker.registeredName && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                {broker.registeredName}
                {broker.overview?.state && <span className={tag(stateTone(broker.overview.state))}>{broker.overview.state}</span>}
                {broker.overview?.region && <span className="text-ink-4">{broker.overview.region}</span>}
              </p>
            )}
            {broker.overview && <div className="mt-4"><OverviewTiles overview={broker.overview} /></div>}
          </header>

          {!hasData ? <Status page={page} /> : (
            <>
              <div className="sticky top-[var(--bar-h)] z-10 -mx-1 mb-4 bg-bg/90 px-1 py-2 backdrop-blur lg:top-0">
                <PillTabs
                  layoutId="qcc-tabs"
                  label="数据类别"
                  fill
                  className="sm:w-auto"
                  active={active}
                  items={QCC_TABS.map((t) => ({ key: t.key, label: t.label, to: t.key === "company" ? "." : `?tab=${t.key}`, replace: true, count: page.tabs[t.key].blocks.filter((b) => b.ok).length || null }))}
                />
              </div>
              <p className="mb-4 text-[12.5px] text-ink-4">{QCC_TABS.find((t) => t.key === active)!.blurb}</p>
              {tab.blocks.length ? (
                <div className="space-y-4">{tab.blocks.map((b) => <Block key={`${active}:${b.key}`} block={b} />)}</div>
              ) : (
                <Notice title="这一类还没有数据">{page.refreshing ? "正在获取，稍等片刻。" : "稍后再来看看。"}</Notice>
              )}
            </>
          )}
        </div>
      </ReadingLayout>
    </>
  );
}
