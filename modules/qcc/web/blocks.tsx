// How each block of a broker's tab is drawn (contract.ts QccView).
import { Fragment, useState, type ReactNode } from "react";
import type { QccBlock } from "../contract.ts";
import { IconChevronDown, IconExternal } from "../../../apps/web/app/components/icons.tsx";
import { columnsOf, count, fieldsOf, isObj, listOf, money, noteOf, text } from "./format.ts";
import { caseTone, LINK, noticeTone, roleTone, stateTone, tag, TEXT } from "./palette.ts";

type Obj = Record<string, unknown>;

const LINE = "border-(color:--qcc-line)";

function Shell({ block, total, children }: { block: QccBlock; total?: number | null; children: ReactNode }) {
  const note = block.ok ? noteOf(block.data) : null;
  return (
    <section id={`b-${block.key}`} className="card scroll-mt-[calc(var(--bar-h)+5rem)] overflow-hidden">
      <header className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b ${LINE} px-4 py-3 lg:px-5`}>
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink before:h-4 before:w-[3px] before:rounded-full before:bg-(color:--qcc)">
          {block.title}
          {total != null && total > 0 && <span className="num rounded-full bg-(color:--qcc-soft) px-2 py-0.5 text-[12px] font-medium leading-none text-(color:--qcc-ink)">{count(total)}</span>}
        </h3>
        {note && <p className="max-w-[46em] text-[12px] leading-relaxed text-ink-4">{note}</p>}
      </header>
      <div className="px-4 py-3.5 lg:px-5">{block.ok ? children : <p className="text-[13px] text-ink-4">{block.error || "暂无数据"}</p>}</div>
    </section>
  );
}

function Empty() {
  return <p className="text-[13px] text-ink-4">暂无记录</p>;
}

/** Records beyond the first few open on request. */
function useMore<T>(rows: T[], first = 8) {
  const [open, setOpen] = useState(false);
  const shown = open ? rows : rows.slice(0, first);
  const button = rows.length > first ? (
    <button type="button" onClick={() => setOpen(!open)} className={`mt-3 inline-flex items-center gap-1 text-[13px] font-medium ${LINK} hover:underline`}>
      {open ? "收起" : `展开全部 ${rows.length} 条`}
      <IconChevronDown size={14} className={open ? "rotate-180" : ""} />
    </button>
  ) : null;
  return { shown, button };
}

const LONG_VALUE = 20;
const CELL = `border-b border-r ${LINE} px-3 py-2.5 text-[13.5px] leading-relaxed`;
const LABEL = `${CELL} bg-(color:--qcc-label) text-ink-3`;

function FieldValue({ name, value }: { name: string; value: string }) {
  if (/^(登记|经营)?状态$/.test(name)) return <span className={tag(stateTone(value))}>{value}</span>;
  if (name.includes("资本")) return <span className="font-semibold text-ink">{money(value)}</span>;
  return <>{value}</>;
}

/** QCC's registration table: shaded label cells beside values, two pairs a row on desktop, long values on a row of their own. */
function Fields({ block }: { block: QccBlock }) {
  const fields = fieldsOf(block.data);
  if (!fields.length) return <Shell block={block}><Empty /></Shell>;
  const short = fields.filter(([, v]) => v.length <= LONG_VALUE);
  const long = fields.filter(([, v]) => v.length > LONG_VALUE);
  return (
    <Shell block={block}>
      <dl className={`grid grid-cols-[8.5rem_minmax(0,1fr)] border-l border-t ${LINE} lg:grid-cols-[8.5rem_minmax(0,1fr)_8.5rem_minmax(0,1fr)]`}>
        {short.map(([k, v]) => (
          <Fragment key={k}>
            <dt className={LABEL}>{k}</dt>
            <dd className={`${CELL} min-w-0 break-words text-ink`}><FieldValue name={k} value={v} /></dd>
          </Fragment>
        ))}
        {short.length % 2 === 1 && (
          <>
            <dt aria-hidden="true" className={`${LABEL} max-lg:hidden`} />
            <dd aria-hidden="true" className={`${CELL} max-lg:hidden`} />
          </>
        )}
        {long.map(([k, v]) => (
          <Fragment key={k}>
            <dt className={LABEL}>{k}</dt>
            <dd className={`${CELL} min-w-0 break-words text-ink lg:col-span-3`}><FieldValue name={k} value={v} /></dd>
          </Fragment>
        ))}
      </dl>
    </Shell>
  );
}

function Table({ block }: { block: QccBlock }) {
  const rows = listOf(block.data);
  const columns = columnsOf(rows);
  const { shown, button } = useMore(rows);
  // An answer about one record (the actual controller) reads better as fields.
  if (!rows.length && isObj(block.data) && fieldsOf(block.data).length > 1) return <Fields block={block} />;
  return (
    <Shell block={block} total={rows.length}>
      {rows.length === 0 ? <Empty /> : (
        <>
          <div className="-mx-4 overflow-x-auto lg:-mx-5">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className={`border-b ${LINE} bg-(color:--qcc-label) text-left text-[12.5px] text-ink-2`}>
                  {columns.map((c) => <th key={c} className="whitespace-nowrap px-4 py-2.5 font-semibold first:pl-4 lg:first:pl-5">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map((row, i) => (
                  <tr key={i} className={`border-b ${LINE} align-top transition-colors last:border-0 hover:bg-(color:--qcc-label)`}>
                    {columns.map((c) => {
                      const v = text(row[c]);
                      return (
                        <td key={c} className="max-w-[28em] px-4 py-2.5 leading-relaxed text-ink-2 first:pl-4 first:font-medium first:text-ink lg:first:pl-5">
                          <span className="line-clamp-3" title={v.length > 60 ? v : undefined}>{v || "—"}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {button}
        </>
      )}
    </Shell>
  );
}

function Risk({ block }: { block: QccBlock }) {
  const data = isObj(block.data) ? block.data : {};
  const factors = (Array.isArray(data["风险因子扫描"]) ? data["风险因子扫描"] : []).filter(isObj)
    .map((f) => ({ name: String(f["风险因子"] ?? ""), n: Number(f["条目数"] ?? 0) }))
    .sort((a, b) => Number(b.n > 0) - Number(a.n > 0) || b.n - a.n);
  const hits = factors.filter((f) => f.n > 0).length;
  return (
    <Shell block={block}>
      <p className="mb-3 text-[13px] text-ink-3">
        扫描 <span className="num font-semibold text-ink">{factors.length}</span> 项风险因子，
        <span className={`num font-semibold ${hits ? "text-hot" : "text-ok"}`}>{hits}</span> 项有记录。
        <span className="text-ink-4">有记录不等于有问题：大型券商作为诉讼当事人、担保方的记录通常较多。</span>
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {factors.map((f) => (
          <li key={f.name} className={`flex items-center justify-between rounded-control px-3 py-2 text-[13px] ${f.n > 0 ? "bg-hot-soft text-ink" : "bg-bg-sunk text-ink-4"}`}>
            <span>{f.name}</span>
            <span className={`num font-semibold ${f.n > 0 ? "text-hot" : ""}`}>{count(f.n)}</span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function Parties({ parties }: { parties: unknown }) {
  if (!isObj(parties)) return null;
  return (
    <dl className="mt-2 grid gap-1 text-[12.5px]">
      {Object.entries(parties).map(([role, names]) => {
        const tone = roleTone(role);
        return (
          <div key={role} className="flex gap-2">
            <dt className={`shrink-0 font-medium ${tone === "gray" ? "text-ink-4" : TEXT[tone]}`}>{role}</dt>
            <dd className="text-ink-2">{text(names)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function ExternalLink({ href, children }: { href: unknown; children: ReactNode }) {
  if (typeof href !== "string" || !/^https:\/\//.test(href)) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={`inline-flex items-center gap-1 text-[12.5px] font-medium ${LINK} hover:underline`}>
      {children} <IconExternal size={12} />
    </a>
  );
}

function CaseItem({ c }: { c: Obj }) {
  const [open, setOpen] = useState(false);
  const summary = typeof c["案例摘要"] === "string" ? c["案例摘要"].replace(/^#+\s*/gm, "").trim() : "";
  const kind = text(c["案件类别"]);
  return (
    <li className={`border-b ${LINE} py-3.5 first:pt-0 last:border-0 last:pb-0`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-4">
        {kind && <span className={tag(caseTone(kind))}>{kind}</span>}
        {[c["文书种类"], c["审级"]].filter(Boolean).map((t) => <span key={String(t)} className={tag("gray")}>{String(t)}</span>)}
        <span className="num">{text(c["裁判日期"])}</span>
      </div>
      <p className="mt-1.5 text-[14px] font-medium leading-snug text-ink">{text(c["案件标题"]) || text(c["案号"])}</p>
      <p className="mt-1 text-[12.5px] text-ink-3">{[text(c["案号"]), text(c["法院名称"]), text(c["案由"])].filter(Boolean).join(" · ")}</p>
      <Parties parties={c["当事人"]} />
      <div className="mt-2 flex flex-wrap items-center gap-4">
        {summary && (
          <button type="button" onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-3 hover:text-(color:--qcc-ink)">
            {open ? "收起摘要" : "裁判摘要"} <IconChevronDown size={13} className={open ? "rotate-180" : ""} />
          </button>
        )}
        <ExternalLink href={c["案例详情页链接"]}>查看文书</ExternalLink>
      </div>
      {open && <p className="mt-2 whitespace-pre-line rounded-control bg-(color:--qcc-label) px-3 py-2.5 text-[13px] leading-[1.8] text-ink-2">{summary}</p>}
    </li>
  );
}

function Cases({ block }: { block: QccBlock }) {
  const rows = listOf(block.data);
  const { shown, button } = useMore(rows, 6);
  return (
    <Shell block={block} total={rows.length}>
      {rows.length === 0 ? <Empty /> : <><ul>{shown.map((c, i) => <CaseItem key={String(c["案例ID"] ?? i)} c={c} />)}</ul>{button}</>}
    </Shell>
  );
}

function Tenders({ block }: { block: QccBlock }) {
  const rows = listOf(block.data);
  const { shown, button } = useMore(rows, 8);
  return (
    <Shell block={block} total={rows.length}>
      {rows.length === 0 ? <Empty /> : (
        <>
          <ul>
            {shown.map((t, i) => {
              const budget = money(text(t["预算金额（元）"]));
              const win = money(text(t["中标金额（元）"]));
              const type = text(t["信息类型"]);
              return (
                <li key={String(t["标讯ID"] ?? i)} className={`border-b ${LINE} py-3.5 first:pt-0 last:border-0 last:pb-0`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-4">
                    {type && <span className={tag(noticeTone(type))}>{type}</span>}
                    {text(t["公告子状态"]) && <span className={tag("gray")}>{text(t["公告子状态"])}</span>}
                    {text(t["企业角色"]) && <span className={tag("purple")}>本公司：{text(t["企业角色"])}</span>}
                    <span className="num">{text(t["发布时间"]).slice(0, 10)}</span>
                  </div>
                  <p className="mt-1.5 text-[14px] font-medium leading-snug text-ink">{text(t["标题"])}</p>
                  <dl className="mt-2 grid gap-1 text-[12.5px] sm:grid-cols-2">
                    {([["招采单位", t["招采单位"]], ["中标单位", t["中标单位"]], ["地区", t["省市区"]], ["行业", t["标讯行业分类"]]] as const).map(([k, v]) =>
                      text(v) ? <div key={k} className="flex gap-2"><dt className="shrink-0 text-ink-4">{k}</dt><dd className="line-clamp-2 text-ink-2">{text(v)}</dd></div> : null)}
                    {budget && <div className="flex gap-2"><dt className="shrink-0 text-ink-4">预算</dt><dd className={`num font-semibold ${TEXT.orange}`}>{budget}</dd></div>}
                    {win && <div className="flex gap-2"><dt className="shrink-0 text-ink-4">中标金额</dt><dd className={`num font-semibold ${TEXT.green}`}>{win}</dd></div>}
                  </dl>
                </li>
              );
            })}
          </ul>
          {button}
        </>
      )}
    </Shell>
  );
}

function TenderProfile({ block }: { block: QccBlock }) {
  const p = isObj(block.data) ? block.data : {};
  const stats: Array<[string, unknown]> = [["相关标讯", p["相关标讯数"]], ["中标", p["中标数"]], ["投标", p["投标数"]], ["招采", p["招采数"]], ["代理", p["代理数"]]];
  return (
    <Shell block={block}>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.map(([k, v]) => (
          <li key={k} className="rounded-control bg-bg-sunk px-3 py-2.5">
            <div className="text-[12px] text-ink-4">{k}</div>
            <div className="num mt-0.5 text-[20px] font-semibold text-ink">{count(v == null || v === "" ? null : Number(v))}</div>
          </li>
        ))}
      </ul>
      {text(p["标讯角色"]) && <p className="mt-3 text-[12.5px] text-ink-3">标讯角色：{text(p["标讯角色"])}</p>}
    </Shell>
  );
}

function Regulations({ block }: { block: QccBlock }) {
  const rows = listOf(block.data);
  const { shown, button } = useMore(rows, 6);
  return (
    <Shell block={block} total={rows.length}>
      {rows.length === 0 ? <Empty /> : (
        <>
          <ul>
            {shown.map((r, i) => {
              const level = text(r["效力级别二级"]) || text(r["效力级别一级"]);
              const rest = [text(r["制定机关"]), text(r["施行日期"]) && `${text(r["施行日期"])} 施行`].filter(Boolean).join(" · ");
              return (
                <li key={String(r["法规ID"] ?? i)} className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b ${LINE} py-2.5 first:pt-0 last:border-0 last:pb-0`}>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-ink">{text(r["法规名称"])}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-4">
                      {level && <span className={tag("blue")}>{level}</span>}
                      {rest}
                    </p>
                  </div>
                  <ExternalLink href={r["引用链接"]}>原文</ExternalLink>
                </li>
              );
            })}
          </ul>
          {button}
        </>
      )}
    </Shell>
  );
}

export function Block({ block }: { block: QccBlock }) {
  switch (block.view) {
    case "fields": return <Fields block={block} />;
    case "risk": return <Risk block={block} />;
    case "cases": return <Cases block={block} />;
    case "tenders": return <Tenders block={block} />;
    case "tenderProfile": return <TenderProfile block={block} />;
    case "regulations": return <Regulations block={block} />;
    default: return <Table block={block} />;
  }
}
