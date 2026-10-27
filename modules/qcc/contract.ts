// What the qcc module's api answers and its pages read (api/routes.ts, web/routes/*).
import type { Brand } from "@aihot/contracts/site";

export type QccTab = "company" | "legal" | "tender";

export const QCC_TABS: ReadonlyArray<{ key: QccTab; label: string; blurb: string }> = [
  { key: "company", label: "企业数据", blurb: "工商登记、股东与高管、上市与债券、对外投资、风险扫描与行政处罚" },
  { key: "legal", label: "法律数据", blurb: "涉及的司法案例、立案与开庭信息，以及证券公司相关的现行法规" },
  { key: "tender", label: "标讯数据", blurb: "招投标参与画像与最近的招标、中标公告" },
];

/** How a block is drawn (web/blocks.tsx); `table` and `fields` work for any answer. */
export type QccView = "fields" | "table" | "risk" | "cases" | "tenders" | "regulations" | "tenderProfile";

/** One tool's answer on a tab. */
export interface QccBlock {
  key: string;
  title: string;
  view: QccView;
  ok: boolean;
  /** The tool's answer as it came (JSON with Chinese keys), or null. */
  data: unknown;
  /** Why it has no data: the tool's own message or the failure. */
  error?: string | null;
}

/**
 * A broker's subject at QCC: `unresolved` not looked up yet, `candidates` several companies matched its name
 * and an admin picks one, `locked` confirmed, `missing` nothing matched.
 */
export type QccEntityStatus = "unresolved" | "candidates" | "locked" | "missing";

export interface QccCandidate {
  name: string;
  creditCode: string;
  founded: string | null;
  legalRep: string | null;
  status: string | null;
}

/** The headline facts drawn above the tabs, read from the blocks. */
export interface QccOverview {
  legalRep: string | null;
  capital: string | null;
  founded: string | null;
  companyType: string | null;
  state: string | null;
  region: string | null;
  stock: { code: string; name: string | null; exchange: string | null; marketCap: string | null } | null;
  riskHits: number | null;
  riskTotal: number | null;
  judgments: number | null;
  wins: number | null;
  tenders: number | null;
}

export interface QccBrokerSummary {
  slug: string;
  name: string;
  definition: string;
  brand: Brand | null;
  /** Selected reports in the last 30 days (the topic's). */
  recent: number;
  status: QccEntityStatus;
  registeredName: string | null;
  fetchedAt: string | null;
  overview: QccOverview | null;
}

export interface QccBrokersResponse {
  configured: boolean;
  brokers: QccBrokerSummary[];
}

export interface QccBrokerPage {
  configured: boolean;
  broker: QccBrokerSummary;
  creditCode: string | null;
  /** A refresh is queued or running: the page asks again shortly. */
  refreshing: boolean;
  /** How long fetched data is kept before a visit asks for it again. */
  cacheDays: number;
  tabs: Record<QccTab, { fetchedAt: string | null; blocks: QccBlock[] }>;
}

/** The module's part of a company topic page (web/TopicCard.tsx). */
export interface QccTopicPart {
  status: QccEntityStatus;
  registeredName: string | null;
  fetchedAt: string | null;
  overview: QccOverview | null;
}

export interface QccServerView {
  key: string;
  role: string | null;
  url: string;
  /** The Authorization header with its secret masked. */
  authorization: string;
}

export interface QccAdminEntity {
  slug: string;
  name: string;
  status: QccEntityStatus;
  registeredName: string | null;
  creditCode: string | null;
  candidates: QccCandidate[];
  suggested: string | null;
  confirmedBy: string | null;
  /** A run is waiting or working in the worker's queue. */
  pending: boolean;
  fetchedAt: string | null;
  lastError: string | null;
}

export interface QccAdminOverview {
  configured: boolean;
  servers: QccServerView[];
  updatedAt: string | null;
  updatedBy: string | null;
  cacheDays: number;
  budget: { perMinute: number; perHour: number; perDay: number; usedHour: number; usedDay: number } | null;
  entities: QccAdminEntity[];
}

export interface QccServerTest {
  key: string;
  role: string | null;
  ok: boolean;
  tools: number;
  error: string | null;
  ms: number;
}
