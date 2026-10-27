// Which QCC tools fill each tab of a broker's page. One call per block, keyed by the confirmed registered
// name (QCC's rule: business tools take a full name or a credit code, never a short name).
import type { QccTab, QccView } from "../contract.ts";

export interface BlockSpec {
  tab: QccTab;
  key: string;
  title: string;
  view: QccView;
  /** The server's role (config.ts roleOf). */
  role: string;
  tool: string;
  args: (name: string) => Record<string, unknown>;
  /** The same answer for every broker (not about the company): one paid call a day serves them all. */
  shared?: boolean;
}

const byName = (name: string) => ({ searchKey: name });

export const BLOCKS: readonly BlockSpec[] = [
  { tab: "company", key: "registration", title: "工商登记", view: "fields", role: "company", tool: "get_company_registration_info", args: byName },
  { tab: "company", key: "listing", title: "上市信息", view: "fields", role: "company", tool: "get_listing_info", args: byName },
  { tab: "company", key: "risk", title: "风险扫描", view: "risk", role: "risk", tool: "get_company_risk_scan", args: byName },
  { tab: "company", key: "shareholders", title: "股东", view: "table", role: "company", tool: "get_shareholder_info", args: byName },
  { tab: "company", key: "controller", title: "实际控制人", view: "table", role: "company", tool: "get_actual_controller", args: byName },
  { tab: "company", key: "personnel", title: "主要人员", view: "table", role: "company", tool: "get_key_personnel", args: byName },
  { tab: "company", key: "investments", title: "对外投资", view: "table", role: "company", tool: "get_external_investments", args: byName },
  { tab: "company", key: "bonds", title: "存续债券", view: "table", role: "operation", tool: "get_bond_financing_info", args: (name) => ({ searchKey: name, bondStatus: ["存续"] }) },
  { tab: "company", key: "penalties", title: "行政处罚", view: "table", role: "risk", tool: "get_administrative_penalty", args: byName },
  { tab: "legal", key: "cases", title: "司法案例", view: "cases", role: "legal-case", tool: "get_judicial_case_search", args: (name) => ({ party: name }) },
  { tab: "legal", key: "filings", title: "立案信息", view: "table", role: "risk", tool: "get_case_filing_info", args: byName },
  { tab: "legal", key: "hearings", title: "开庭公告", view: "table", role: "risk", tool: "get_hearing_notice", args: byName },
  {
    tab: "legal", key: "regulations", title: "证券公司相关现行法规", view: "regulations", role: "legal-regulation", tool: "get_legal_regulation_search",
    args: () => ({ keyword: "证券公司", effectStatus: ["现行有效"] }), shared: true,
  },
];

/** The tender tab: the company's QCC tender profile (its id there), then its recent notices by that id. */
export const TENDER_PROFILE = { tab: "tender" as const, key: "profile", title: "标讯画像", view: "tenderProfile" as const, role: "tender", tool: "search_companies" };
export const TENDER_LIST = { tab: "tender" as const, key: "tenders", title: "最近标讯", view: "tenders" as const, role: "tender", tool: "search_company_tenders" };
