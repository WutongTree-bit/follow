// Topic pages: which articles a topic takes, and their counts.
// Written before the code, from the ways it can go wrong:
// - a company topic takes an article about another company that only mentions it (several subjects,
//   its name nowhere in the title), or drops one about it whose original title names it, whose title
//   names it in a Latin name in another case or next to Chinese text, or that names it nowhere (it is
//   the article's only subject);
// - a Latin name matches inside another word ("NeoCITIC Securities" is not CITIC Securities); a headline
//   naming a company that is not a subject of the article gets in;
// - a business-direction topic stops taking its tags;
// - withdrawn or not yet released articles appear in a list or a count;
// - an article or story page names a topic its reports do not belong to;
// - a topic without content has no page, or an unknown slug or a page past the end has one.
import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { publishArticle } from "@aihot/backend/publication/publish";
import { TOPICS, loadTopicPage, listTopicSummaries, topicsOfStory } from "@aihot/backend/publication/topics";
import { buildApp } from "../apps/api/src/app.ts";

const T = tag();
const OFFICIAL = `test-topics-official-${T}`;
const MEDIA = `test-topics-media-${T}`;
const app = await buildApp();

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, first_party, next_fetch_at) VALUES
    (${OFFICIAL}, 'Official', 'rss', 'T1', 'editorial', true, '2100-01-01'),
    (${MEDIA}, 'Media', 'rss', 'T2', 'editorial', false, '2100-01-01')`;
});
after(async () => {
  await app.close();
  await stopBoss();
  await closeDb();
});

let n = 0;
interface Report {
  source?: string;
  at: Date;
  title: string;
  originalTitle?: string;
  subjects?: string[];
  tags?: string[];
  score?: number;
  selected?: boolean;
  fact?: number;
  category?: string;
}

/** A published report; `fact` links it to a fact before publishing, as grouping would. */
async function report(r: Report): Promise<string> {
  n += 1;
  const { articleId } = await upsertMaterial({
    sourceId: r.source ?? MEDIA, url: `https://example.com/topics-${T}-${n}`, title: r.originalTitle ?? r.title, bodyText: "body", bodyHtml: "<p>body</p>", bodyStatus: "ok", via: "fetch", publishedAt: r.at,
  });
  await sql`UPDATE articles SET discovered_at = ${r.at}, timeline_at = ${r.at}, grouped_at = now() WHERE id = ${articleId}`;
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected, subjects, tags)
            VALUES (${articleId}, 1, 'rule', 'pass', ${r.category ?? "mna"}, ${r.title}, ${`摘要 ${n}`}, ${r.score ?? 80}, ${r.selected ?? true}, ${r.subjects ?? []}, ${[r.category === "regulation" ? "监管新规" : r.category === "fintech" ? "金融科技" : r.category === "industry" ? "行业动态" : r.category === "opinion" ? "评论/解读" : "并购重组", ...(r.tags ?? [])]})`;
  if (r.fact) await sql`INSERT INTO fact_articles (fact_id, article_id, role) VALUES (${r.fact}, ${articleId}, 'report')`;
  await publishArticle(articleId, { releasedAt: new Date(r.at.getTime() + 60_000) });
  return articleId;
}

async function story(title: string): Promise<{ id: number; publicId: string }> {
  const publicId = randomUUID();
  const [s] = await sql<{ id: number }[]>`INSERT INTO stories (public_id, title, first_report_at, latest_at) VALUES (${publicId}, ${title}, now(), now()) RETURNING id`;
  return { id: s!.id, publicId };
}

async function fact(storyId: number | null, title: string): Promise<number> {
  const [f] = await sql<{ id: number }[]>`INSERT INTO facts (public_id, story_id, title) VALUES (${`f-${T}-${randomUUID()}`}, ${storyId}, ${title}) RETURNING id`;
  return f!.id;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);
const ids = (items: Array<{ id: string }>) => items.map((i) => i.id);
const page = async (slug: string, p = 1) => {
  const data = await loadTopicPage(slug, p, new Date());
  assert.ok(data, `${slug} page ${p}`);
  return data;
};
/** Every article of a topic, over all its pages. */
async function members(slug: string): Promise<string[]> {
  const first = await page(slug);
  const out = ids(first.items);
  for (let p = 2; p <= first.pageCount; p++) out.push(...ids((await page(slug, p)).items));
  return out;
}

test("a company topic takes the articles about it, not the ones that only mention it", async () => {
  const about = await report({ at: hoursAgo(30), title: `股东大会通过重组方案 ${T}`, subjects: ["csc"] });
  const product = await report({ at: hoursAgo(31), title: `期货子公司并购获批 ${T}`, subjects: ["csc"] });
  const original = await report({ at: hoursAgo(32), title: `新增资方案获批 ${T}`, originalTitle: `中信建投证券获批增资 ${T}`, subjects: ["csc", "gtht"] });
  const warning = await report({ at: hoursAgo(33), title: `证监会向国泰海通出具警示函 ${T}`, subjects: ["gtht", "csc", "htsc"] });
  const lowerCase = await report({ at: hoursAgo(34), title: `citic securities 公布新的合规制度 ${T}`, subjects: ["citics", "csc"] });
  const pact = await report({ at: hoursAgo(35), title: `二十余家券商签署合规自律公约 ${T}`, subjects: ["gtht", "csc", "cicc"] });
  const embedded = await report({ at: hoursAgo(36), title: `NeoCITIC Securities 标准发布，国泰海通参与 ${T}`, subjects: ["citics", "gtht"] });
  const adjacent = await report({ at: hoursAgo(37), title: `发布CITIC Securities的新方案 ${T}`, subjects: ["citics", "gtht"] });
  const headline = await report({ at: hoursAgo(38), title: `中信建投 被一篇盘点提到 ${T}`, subjects: ["cicc"] });
  const compliance = await report({ at: hoursAgo(39), title: `合规管理系统发布 ${T}`, tags: ["合规风控"] });

  const csc = await members("csc");
  for (const id of [about, product, original]) assert.ok(csc.includes(id), "about 中信建投");
  for (const id of [warning, lowerCase, pact, headline]) assert.ok(!csc.includes(id), "only mentions 中信建投");
  const gtht = await members("gtht");
  for (const id of [warning, embedded]) assert.ok(gtht.includes(id), "about 国泰海通");
  for (const id of [original, pact]) assert.ok(!gtht.includes(id), "only mentions 国泰海通");
  const citics = await members("citics");
  for (const id of [lowerCase, adjacent]) assert.ok(citics.includes(id), "CITIC Securities in another case or next to Chinese text");
  assert.ok(!citics.includes(embedded), "NeoCITIC Securities is not CITIC Securities");
  assert.ok((await members("regulation")).includes(compliance), "a direction takes its tag");

  // The article page names the topics it belongs to.
  const topicsOf = async (id: string) => {
    const res = await app.inject({ method: "GET", url: `/api/site/items/${id}` });
    return (JSON.parse(res.body) as { topics: Array<{ slug: string }> }).topics.map((t) => t.slug);
  };
  assert.deepEqual(await topicsOf(about), ["csc", "mna"]);
  assert.deepEqual(await topicsOf(warning), ["gtht", "mna"]);
  assert.deepEqual(await topicsOf(pact), ["mna"]);
  assert.deepEqual(await topicsOf(compliance), ["mna", "regulation"]);
});

test("a story page names the topics of its reports", async () => {
  const launch = await story(`合规管理办法 V2 发布 ${T}`);
  await report({ source: OFFICIAL, at: hoursAgo(26), title: `合规管理办法 V2 发布 ${T}`, tags: ["合规风控"], fact: await fact(launch.id, "发布 V2") });
  assert.deepEqual(await topicsOfStory(launch.id), [{ slug: "mna", name: "并购与牌照" }, { slug: "regulation", name: "监管与处罚" }]);
});

test("withdrawn articles stay out of lists and counts", async () => {
  const kept = await report({ at: hoursAgo(5), title: `华泰证券完成子公司增资 ${T}`, subjects: ["htsc"] });
  const withdrawn = await report({ at: hoursAgo(4), title: `华泰证券撤回的消息 ${T}`, subjects: ["htsc"] });
  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id = ${withdrawn}`;

  const data = await page("htsc");
  assert.deepEqual(ids(data.items), [kept]);
  assert.equal(data.topic.total, 1);
  const summary = (await listTopicSummaries()).topics.find((t) => t.slug === "htsc")!;
  assert.equal(summary.latest?.title, `华泰证券完成子公司增资 ${T}`, "the index shows the newest public article");
});

test("every topic has a page; unknown topics and pages past the end have none", async () => {
  const empty = await page("ubs-sec");
  assert.equal(empty.topic.indexable, false, "a topic without content is not indexed");
  assert.deepEqual(empty.items, []);
  assert.equal(await loadTopicPage("not-a-topic", 1, new Date()), null);
  assert.equal(await loadTopicPage("ubs-sec", 2, new Date()), null);
  const index = await app.inject({ method: "GET", url: "/api/site/topics" });
  const body = JSON.parse(index.body) as { groups: Array<{ key: string }>; topics: Array<{ slug: string }> };
  assert.deepEqual(body.groups.map((g) => g.key), ["company", "field", "genre"]);
  assert.deepEqual(body.topics.map((t) => t.slug).sort(), TOPICS.map((t) => t.slug).sort(), "the index lists every topic");
});
