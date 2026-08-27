import assert from "node:assert/strict";
import { test } from "node:test";
// Explicit ".ts" so `node --test` resolves it — see the tsconfig note.
import { focusAreas, topicMastery, type TopicProblem } from "./topics.ts";

function p(slug: string, topics: string[], solved: boolean): TopicProblem {
  return { slug, topics, solved };
}

test("an empty problem set yields no topics", () => {
  assert.deepEqual(topicMastery([]), []);
});

test("a problem counts once toward every topic it carries", () => {
  const mastery = topicMastery([p("two-sum", ["Array", "Hash Table"], true)]);
  assert.equal(mastery.length, 2);
  for (const m of mastery) {
    assert.equal(m.total, 1);
    assert.equal(m.solved, 1, "multi-tag problems credit each topic in full, not a fraction");
  }
});

test("untagged problems contribute to nothing", () => {
  assert.deepEqual(topicMastery([p("mystery", [], true)]), []);
});

test("duplicate tags on one problem are not double-counted", () => {
  const [array] = topicMastery([p("dupe", ["Array", "Array"], false)]);
  assert.equal(array.total, 1);
});

test("strength bands follow the solved ratio", () => {
  const build = (solved: number, total: number) =>
    topicMastery(
      Array.from({ length: total }, (_, i) => p(`p${i}`, ["Array"], i < solved))
    )[0];

  assert.equal(build(0, 4).strength, "untouched");
  assert.equal(build(1, 4).strength, "starting", "25% is a start");
  assert.equal(build(2, 4).strength, "steady", "50% is steady");
  assert.equal(build(3, 4).strength, "strong", "75% crosses into strong");
  assert.equal(build(4, 4).strength, "strong");
});

test("topics are ordered by size, then alphabetically", () => {
  const mastery = topicMastery([
    p("a", ["Graph"], true),
    p("b", ["Array"], true),
    p("c", ["Array"], false),
    p("d", ["Dynamic Programming"], false),
  ]);
  assert.equal(mastery[0].topic, "Array", "biggest topic first");
  assert.deepEqual(
    mastery.slice(1).map((m) => m.topic),
    ["Dynamic Programming", "Graph"],
    "equal-sized topics fall back to alphabetical"
  );
});

test("focusAreas ranks by how much work is left, not by lowest ratio alone", () => {
  const mastery = topicMastery([
    // Graph: 1 of 6 done → 5 remaining.
    ...Array.from({ length: 6 }, (_, i) => p(`g${i}`, ["Graph"], i < 1)),
    // Trees: 0 of 3 done → 3 remaining, but a worse ratio.
    ...Array.from({ length: 3 }, (_, i) => p(`t${i}`, ["Tree"], false)),
  ]);

  const focus = focusAreas(mastery);
  assert.equal(focus[0].topic, "Graph", "more outstanding problems outranks a worse ratio");
  assert.equal(focus[1].topic, "Tree");
});

test("focusAreas ignores finished topics and ones too small to matter", () => {
  const mastery = topicMastery([
    ...Array.from({ length: 4 }, (_, i) => p(`d${i}`, ["Done"], true)),
    ...Array.from({ length: 2 }, (_, i) => p(`s${i}`, ["Tiny"], false)),
    ...Array.from({ length: 5 }, (_, i) => p(`r${i}`, ["Real"], false)),
  ]);

  assert.deepEqual(
    focusAreas(mastery).map((m) => m.topic),
    ["Real"],
    "a fully solved topic is not a focus area, and two problems is too few to call one"
  );
});

test("focusAreas respects the limit", () => {
  const mastery = topicMastery(
    ["A", "B", "C", "D", "E"].flatMap((topic) =>
      Array.from({ length: 3 }, (_, i) => p(`${topic}${i}`, [topic], false))
    )
  );
  assert.equal(focusAreas(mastery, 2).length, 2);
});
