import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  CAT_SYLLABUS,
  GATE_DA_SYLLABUS,
  ZONE_SYLLABI,
  allTopicIds,
  nextTopicStatus,
  summariseSections,
  type TopicStatus,
} from "./zones.ts";

for (const syllabus of Object.values(ZONE_SYLLABI)) {
  test(`${syllabus.exam}: topic ids are unique and namespaced by section`, () => {
    const ids = allTopicIds(syllabus);
    assert.equal(new Set(ids).size, ids.length);
    for (const section of syllabus.sections) {
      for (const topic of section.topics) assert.ok(topic.id.startsWith(`${section.id}.`), topic.id);
    }
  });

  test(`${syllabus.exam}: every group names real topics, and each topic sits in at most one group`, () => {
    for (const section of syllabus.sections) {
      if (!section.groups) continue;
      const own = new Set(section.topics.map((topic) => topic.id));
      const seen = new Set<string>();
      for (const group of section.groups) {
        for (const id of group.topicIds) {
          assert.ok(own.has(id), `${id} is not a topic of ${section.id}`);
          assert.ok(!seen.has(id), `${id} is in two groups`);
          seen.add(id);
        }
      }
      assert.equal(seen.size, own.size, `${section.id}: some topics belong to no group`);
    }
  });
}

test("GATE DA covers the seven official subjects plus General Aptitude", () => {
  assert.deepEqual(
    GATE_DA_SYLLABUS.sections.map((s) => s.id),
    ["ps", "la", "co", "pdsa", "db", "ml", "ai", "ga"]
  );
  assert.equal(GATE_DA_SYLLABUS.official, true);
  assert.equal(CAT_SYLLABUS.official, false);
});

test("revised counts as studied, and untouched topics count as neither", () => {
  const progress = new Map<string, TopicStatus>([
    ["la.eigen", "studied"],
    ["la.svd", "revised"],
    ["ps.bayes", "revised"],
  ]);
  const summary = summariseSections(GATE_DA_SYLLABUS, progress);
  const la = summary.find((s) => s.sectionId === "la")!;
  assert.deepEqual(la, { sectionId: "la", total: 10, studied: 2, revised: 1 });
  const co = summary.find((s) => s.sectionId === "co")!;
  assert.deepEqual(co, { sectionId: "co", total: 5, studied: 0, revised: 0 });
});

test("progress on ids that are no longer in the syllabus is ignored", () => {
  const summary = summariseSections(CAT_SYLLABUS, new Map([["qa.removed-topic", "studied" as const]]));
  assert.equal(summary.reduce((n, s) => n + s.studied, 0), 0);
});

test("a click cycles untouched → studied → revised → untouched", () => {
  assert.equal(nextTopicStatus(undefined), "studied");
  assert.equal(nextTopicStatus("studied"), "revised");
  assert.equal(nextTopicStatus("revised"), undefined);
});
