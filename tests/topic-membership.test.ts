// Failure cases: a single-topic count disagrees with the membership list; a null company pattern
// still depends on titles; a title match bypasses required tags; one subject differs from several;
// an original-title or case-insensitive match is lost; a company name matches inside another word;
// non-selected, withdrawn and unreleased reports change the selected list or pool count incorrectly.
import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { findTopic, loadTopicPage, topicMembership } from "@aihot/backend/publication/topics";

after(closeDb);

test("topic lists and pool counts share the exact membership predicate", async () => {
  const prefix = `membership-${tag()}`;
  const at = new Date("2026-01-01T00:00:00Z");
  const now = new Date(+at + 1000);
  const cases = [
    { title: "", original: null, tags: ["合规风控"], topics: ["regulation"] },
    { title: "中信证券 合规风控", original: null, tags: [], topics: [] },
    { title: "", original: null, tags: ["entity:citics"], topics: ["citics"] },
    { title: "Unrelated", original: null, tags: ["entity:citics", "entity:csc"], topics: [] },
    { title: "Unrelated", original: "CITIC SECURITIES announces a deal", tags: ["entity:citics", "entity:csc"], topics: ["citics"] },
    { title: "NeoCITIC Securities", original: null, tags: ["entity:citics", "entity:csc"], topics: [] },
    { title: "发布CITIC Securities的新方案", original: null, tags: ["entity:citics", "entity:csc"], topics: ["citics"] },
    { title: "海通证券完成合并", original: null, tags: ["entity:gtht", "entity:citics"], topics: ["gtht"] },
    { title: "Unselected", original: null, tags: ["合规风控", "entity:citics"], topics: ["regulation", "citics"], selected: false },
    { title: "Withdrawn", original: null, tags: ["合规风控", "entity:citics"], topics: ["regulation", "citics"], visibility: "withdrawn" },
    { title: "Future", original: null, tags: ["合规风控", "entity:citics"], topics: ["regulation", "citics"], future: true },
  ];
  await sql`INSERT INTO sources (id, name, kind, tier) VALUES (${prefix}, ${prefix}, 'rss', 'T1')`;
  for (const [i, row] of cases.entries()) {
    const id = `${prefix}-${i}`;
    await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
      VALUES (${id}, ${prefix}, ${id}, ${`https://example.org/${id}`}, ${row.title}, ${at}, ${at})`;
    await sql`INSERT INTO publications (article_id, source_id, title, original_title, url, discovered_at, timeline_at,
      sort_at, visible_after, selected, eligible, visibility, channel, tags)
      VALUES (${id}, ${prefix}, ${row.title}, ${row.original}, ${`https://example.org/${id}`}, ${at}, ${at},
        ${at}, ${row.future ? new Date(+now + 1) : at}, ${row.selected ?? true}, true, ${row.visibility ?? "public"}, 'news', ${row.tags})`;
  }
  const topics = ["citics", "gtht", "regulation"].map(slug => findTopic(slug)!);
  const membership = new Map((await sql<{ id: string; topics: string[] }[]>`
    SELECT p.article_id AS id, ${topicMembership(topics)} AS topics FROM publications p WHERE p.source_id = ${prefix}`)
    .map(row => [row.id, row.topics]));
  for (const [i, row] of cases.entries()) assert.deepEqual(new Set(membership.get(`${prefix}-${i}`)), new Set(row.topics));
  for (const topic of topics) {
    const page = await loadTopicPage(topic.slug, 1, now);
    assert.ok(page);
    const visible = cases.map((row, i) => ({ ...row, id: `${prefix}-${i}` }))
      .filter(row => row.topics.includes(topic.slug) && !row.visibility && !row.future);
    assert.equal(page.topic.poolTotal, visible.length, `${topic.slug} pool`);
    assert.deepEqual(page.items.map(row => row.id).sort(), visible.filter(row => row.selected !== false).map(row => row.id).sort(), `${topic.slug} selected`);
  }
});
