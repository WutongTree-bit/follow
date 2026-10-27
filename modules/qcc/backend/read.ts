// What readers see: the broker directory, a broker's page and its card on the topic page. Reading never
// calls QCC; a page whose data is missing or older than the cache asks the worker for it (refresh.ts).
import { sql } from "@aihot/backend/db";
import { listTopicSummaries } from "@aihot/backend/publication/topics";
import type { TopicSummary } from "@aihot/contracts/site";
import { QCC_TABS, type QccBlock, type QccBrokerPage, type QccBrokerSummary, type QccBrokersResponse, type QccOverview, type QccTab, type QccTopicPart } from "../contract.ts";
import { CACHE_DAYS, loadConfig } from "./config.ts";
import { brokerTopics, entityRows, type EntityRow } from "./entities.ts";
import { pendingRuns, requestRefresh } from "./refresh.ts";

function summary(topic: TopicSummary | undefined, fallback: { slug: string; name: string; definition: string }, row: EntityRow | undefined): QccBrokerSummary {
  return {
    slug: fallback.slug,
    name: fallback.name,
    definition: fallback.definition,
    brand: topic?.brand ?? null,
    recent: topic?.recent ?? 0,
    status: row?.status ?? "unresolved",
    registeredName: row?.status === "locked" ? row.name : null,
    fetchedAt: row?.fetched_at?.toISOString() ?? null,
    overview: row?.status === "locked" ? ((row.overview as QccOverview | null) ?? null) : null,
  };
}

async function topicSummaries(): Promise<Map<string, TopicSummary>> {
  const { topics } = await listTopicSummaries();
  return new Map(topics.map((t) => [t.slug, t]));
}

export async function listBrokers(): Promise<QccBrokersResponse> {
  const [{ config }, topics, rows] = await Promise.all([loadConfig(), topicSummaries(), entityRows()]);
  return { configured: !!config, brokers: brokerTopics().map((t) => summary(topics.get(t.slug), t, rows.get(t.slug))) };
}

/** A broker's page; a visit asks for its data when it is missing or stale. Null when there is no such broker. */
export async function brokerPage(slug: string): Promise<QccBrokerPage | null> {
  const topic = brokerTopics().find((t) => t.slug === slug);
  if (!topic) return null;
  const { config } = await loadConfig();
  const refreshing = config ? await requestRefresh(slug) : (await pendingRuns([slug])).has(slug);
  const [topics, rows, sections] = await Promise.all([
    topicSummaries(),
    entityRows([slug]),
    sql<{ tab: QccTab; blocks: string; fetched_at: Date }[]>`SELECT tab, blocks::text AS blocks, fetched_at FROM qcc_sections WHERE slug = ${slug}`,
  ]);
  const row = rows.get(slug);
  const locked = row?.status === "locked";
  const tabs = Object.fromEntries(QCC_TABS.map(({ key }) => {
    const s = locked ? sections.find((x) => x.tab === key) : undefined;
    return [key, { fetchedAt: s?.fetched_at.toISOString() ?? null, blocks: s ? (JSON.parse(s.blocks) as QccBlock[]) : [] }];
  })) as QccBrokerPage["tabs"];
  return {
    configured: !!config,
    broker: summary(topics.get(slug), topic, row),
    creditCode: locked ? row!.credit_code : null,
    refreshing,
    cacheDays: CACHE_DAYS,
    tabs,
  };
}

/** Every broker's card on its topic page, read with the topic index (kept a minute). */
export async function topicParts(): Promise<Record<string, QccTopicPart>> {
  const rows = await entityRows();
  return Object.fromEntries([...rows.values()].map((r) => [r.slug, {
    status: r.status,
    registeredName: r.status === "locked" ? r.name : null,
    fetchedAt: r.fetched_at?.toISOString() ?? null,
    overview: r.status === "locked" ? ((r.overview as QccOverview | null) ?? null) : null,
  }]));
}
