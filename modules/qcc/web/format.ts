// Reading QCC's answers (JSON with Chinese keys) for display.

type Obj = Record<string, unknown>;

export const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/** The answer's list of records: the array itself, or its first array of objects. */
export function listOf(data: unknown): Obj[] {
  if (Array.isArray(data)) return data.filter(isObj);
  if (!isObj(data)) return [];
  for (const value of Object.values(data)) if (Array.isArray(value) && value.some(isObj)) return value.filter(isObj);
  return [];
}

/** QCC's own sentence about the answer: how many records, what was cut. Its advice to the calling agent is left out. */
export function noteOf(data: unknown): string | null {
  if (!isObj(data)) return null;
  const summary = data["摘要"] ?? (isObj(data["查询摘要"]) ? data["查询摘要"]["结果说明"] : null);
  if (typeof summary !== "string") return null;
  const kept = summary.split(/(?<=[。；])/).filter((s) => !/调用|工具|如需更多|重试|必须|用户/.test(s)).join("").trim();
  return kept || null;
}

/** A field's value as text: lists joined, companies by name, nested records as "键：值". */
export function text(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (Array.isArray(v)) return v.map(text).filter(Boolean).join("、");
  if (isObj(v)) {
    const named = v["企业名称"] ?? v["名称"] ?? v["姓名"];
    if (typeof named === "string") return named;
    return Object.entries(v).map(([k, x]) => (text(x) ? `${k}：${text(x)}` : "")).filter(Boolean).join("；");
  }
  return String(v);
}

/** Identifiers and links are for machines; tables leave them out. */
const hidden = (key: string) => /ID$|^id$|链接$|^企业名称$/.test(key);

/** The columns worth a table: in the records' order, without ids and links or always-empty fields. */
export function columnsOf(rows: Obj[], max = 7): string[] {
  const keys: string[] = [];
  for (const row of rows.slice(0, 20)) for (const k of Object.keys(row)) if (!keys.includes(k) && !hidden(k)) keys.push(k);
  return keys.filter((k) => rows.some((r) => text(r[k]))).slice(0, max);
}

/** The scalar fields of a record, for a key–value grid. */
export function fieldsOf(data: unknown, skip: string[] = []): Array<[string, string]> {
  if (!isObj(data)) return [];
  return Object.entries(data)
    .filter(([k, v]) => !skip.includes(k) && !hidden(k) && k !== "摘要" && k !== "提示" && !(Array.isArray(v) && v.some(isObj)))
    .map(([k, v]) => [k, isObj(v) ? Object.values(v).map(text).filter(Boolean).join(" / ") : text(v)] as [string, string])
    .filter(([, v]) => v);
}

/** "1482054.6829万元" → "148.21 亿元"; amounts in 元 → 万/亿. */
export function money(v: string | null | undefined): string | null {
  if (!v) return null;
  const wan = /^([\d.]+)万(元|人民币)?$/.exec(v.replace(/,/g, ""));
  if (wan) {
    const n = Number(wan[1]);
    return n >= 10000 ? `${(n / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 亿元` : `${n.toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 万元`;
  }
  const yuan = /^\d+(\.\d+)?$/.exec(v.replace(/,/g, ""));
  if (yuan) {
    const n = Number(v.replace(/,/g, ""));
    if (n >= 1e8) return `${(n / 1e8).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 亿元`;
    if (n >= 1e4) return `${(n / 1e4).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 万元`;
    return `${n.toLocaleString("zh-CN")} 元`;
  }
  return v;
}

export function count(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : n.toLocaleString("zh-CN");
}
