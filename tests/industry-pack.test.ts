import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ENTITIES, IDENTITY_LEXICON, PUBLISHER_DOMAINS } from "@aihot/industry/taxonomy";

interface Topic { slug: string; group: string; entityId?: string }
const { topics } = JSON.parse(readFileSync(new URL("../industry/topics.json", import.meta.url), "utf8")) as { topics: Topic[] };
const companies = topics.filter((t) => t.group === "company");

test("every company in the vocabulary has exactly one topic, and every company topic names a company", () => {
  const byEntity = new Map<string, number>();
  for (const t of companies) byEntity.set(t.entityId ?? "", (byEntity.get(t.entityId ?? "") ?? 0) + 1);
  for (const id of Object.keys(ENTITIES)) assert.equal(byEntity.get(id), 1, `topic for ${id}`);
  for (const id of byEntity.keys()) assert.ok(id in ENTITIES, `topic names unknown company ${id}`);
  assert.equal(new Set(topics.map((t) => t.slug)).size, topics.length, "topic slugs are unique");
});

test("a name is never two companies' name, so a subject is never ambiguous", () => {
  const key = (v: string) => v.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "");
  const owners = new Map<string, string[]>();
  for (const [id, e] of Object.entries(ENTITIES)) {
    for (const n of new Set([id, e.name, ...e.aliases, ...(e.orgNames ?? []), ...(e.otherNames ?? [])].map(key))) owners.set(n, [...(owners.get(n) ?? []), id]);
  }
  assert.deepEqual([...owners].filter(([, ids]) => ids.length > 1), []);
});

test("each company has an identity pattern that does not also claim another company's name", () => {
  const ids = IDENTITY_LEXICON.map((l) => l.id);
  assert.deepEqual([...new Set(ids)].sort(), Object.keys(ENTITIES).sort());
  assert.equal(new Set(ids).size, ids.length, "one lexicon entry per company");
  for (const l of IDENTITY_LEXICON) {
    for (const [id, e] of Object.entries(ENTITIES)) {
      if (id !== l.id) assert.ok(!l.patterns.some((re) => re.test(e.name)), `${l.id} also matches the name of ${id} (${e.name})`);
    }
  }
});

test("an official site belongs to one company", () => {
  const owner = new Map<string, string>();
  for (const p of PUBLISHER_DOMAINS) {
    assert.ok(p.entityId in ENTITIES, `domains of unknown company ${p.entityId}`);
    for (const d of p.domains) {
      assert.ok(!owner.has(d) || owner.get(d) === p.entityId, `${d} is claimed by ${owner.get(d)} and ${p.entityId}`);
      owner.set(d, p.entityId);
    }
  }
});

test("the names of an exchange or a newspaper are not read as a securities company", () => {
  const shzq = IDENTITY_LEXICON.find((l) => l.id === "shzq")!;
  assert.ok(shzq.patterns.some((re) => re.test("上海证券完成增资")));
  assert.ok(!shzq.patterns.some((re) => re.test("上海证券交易所发布新规")) && !shzq.patterns.some((re) => re.test("《上海证券报》报道")));
  const datong = IDENTITY_LEXICON.find((l) => l.id === "dtzq")!;
  assert.ok(datong.patterns.some((re) => re.test("大通证券公告")) && !datong.patterns.some((re) => re.test("摩根大通证券（中国）")));
});
