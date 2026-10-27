// The 企查查-style palette of the 券商档案 pages: brand blue, tinted label cells and tags in blue, red, orange,
// green and purple. A wrapper carrying QCC_SCOPE defines the variables (light and dark), so the rest of the site keeps its teal theme.
export const QCC_SCOPE = [
  "[--qcc:#128bed]", "[--qcc-ink:#0b6fc7]", "[--qcc-soft:#e8f3fd]", "[--qcc-label:#f4f8fc]", "[--qcc-line:#e2eaf3]",
  "[--qcc-red:#cf2f2f]", "[--qcc-red-soft:#fdeded]",
  "[--qcc-orange:#a85400]", "[--qcc-orange-soft:#fff2e0]",
  "[--qcc-green:#0a7a50]", "[--qcc-green-soft:#e3f5ec]",
  "[--qcc-purple:#6a43c9]", "[--qcc-purple-soft:#f0ebfc]",
  "dark:[--qcc:#3b9cf0]", "dark:[--qcc-ink:#74bbf8]", "dark:[--qcc-soft:#3b9cf026]", "dark:[--qcc-label:#3b9cf012]", "dark:[--qcc-line:#ffffff17]",
  "dark:[--qcc-red:#ff8a80]", "dark:[--qcc-red-soft:#ff6b5f26]",
  "dark:[--qcc-orange:#f5b061]", "dark:[--qcc-orange-soft:#f5b06126]",
  "dark:[--qcc-green:#55d1a0]", "dark:[--qcc-green-soft:#55d1a026]",
  "dark:[--qcc-purple:#b79cf5]", "dark:[--qcc-purple-soft:#b79cf529]",
].join(" ");

export type Tone = "blue" | "red" | "orange" | "green" | "purple" | "gray";

const TAG: Record<Tone, string> = {
  blue: "bg-(color:--qcc-soft) text-(color:--qcc-ink)",
  red: "bg-(color:--qcc-red-soft) text-(color:--qcc-red)",
  orange: "bg-(color:--qcc-orange-soft) text-(color:--qcc-orange)",
  green: "bg-(color:--qcc-green-soft) text-(color:--qcc-green)",
  purple: "bg-(color:--qcc-purple-soft) text-(color:--qcc-purple)",
  gray: "bg-bg-sunk text-ink-3",
};

export const TEXT: Record<Tone, string> = {
  blue: "text-(color:--qcc-ink)",
  red: "text-(color:--qcc-red)",
  orange: "text-(color:--qcc-orange)",
  green: "text-(color:--qcc-green)",
  purple: "text-(color:--qcc-purple)",
  gray: "text-ink",
};

export const tag = (tone: Tone) => `inline-flex items-center rounded-mark px-1.5 py-0.5 text-[12px] font-medium leading-none ${TAG[tone]}`;

/** Links and controls on these pages are QCC blue, not the site's teal. */
export const LINK = "text-(color:--qcc-ink)";

/** 存续 and 在业 are green; a company being wound up or revoked is red; anything else is worth a look. */
export const stateTone = (state: string): Tone => (/存续|在业|开业|在营|正常/.test(state) ? "green" : /注销|吊销|撤销|清算|停业|迁出/.test(state) ? "red" : "orange");

/** Case types as QCC colours them. */
export const caseTone = (kind: string): Tone => (/民事/.test(kind) ? "blue" : /刑事/.test(kind) ? "red" : /行政/.test(kind) ? "orange" : /执行/.test(kind) ? "purple" : "gray");

/** Who a party is in a case: the side that brought it, the side answering it, or anyone else. */
export const roleTone = (role: string): Tone => (/^被|应诉/.test(role) ? "orange" : /原告|申请|上诉|起诉|公诉|执行/.test(role) ? "blue" : "gray");

/** A tender notice's type: awards green, calls for bids blue, changes orange, cancellations red. */
export const noticeTone = (type: string): Tone => (/中标|成交/.test(type) ? "green" : /终止|废标|流标|失败/.test(type) ? "red" : /变更|更正|澄清/.test(type) ? "orange" : /招标|采购|邀请|询价|竞争|磋商/.test(type) ? "blue" : "gray");
