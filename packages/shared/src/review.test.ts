import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { ReviewCandidate } from "./review.ts";
import { buildReviewQueue, reviewQueueCounts, REVIEW_DEFAULTS } from "./review.ts";

/** A fixed "now" so day maths is deterministic and timezone-stable. Local
 * midnight keeps `localDaysSince` unambiguous in whatever TZ the suite runs. */
const NOW = new Date(2026, 9, 2, 0, 0, 0); // 2 Oct 2026, local

/** ISO string for `days` local days before NOW (day-level, at midnight). */
function daysAgo(days: number): string {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - days);
  return d.toISOString();
}

function solved(overrides: Partial<ReviewCandidate> = {}): ReviewCandidate {
  return {
    id: "s1",
    title: "Two Sum",
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    kind: "solved",
    lastActiveAt: daysAgo(10),
    ...overrides,
  };
}

function flagged(overrides: Partial<ReviewCandidate> = {}): ReviewCandidate {
  return {
    id: "f1",
    title: "Tricky DP",
    kind: "flagged",
    flagLevel: "red",
    lastActiveAt: daysAgo(5),
    ...overrides,
  };
}

test("a fresh solve (inside the quiet period) is not queued", () => {
  const q = buildReviewQueue([solved({ lastActiveAt: daysAgo(1) })], { now: NOW });
  assert.equal(q.length, 0);
});

test("a solve just past the quiet period is queued", () => {
  const q = buildReviewQueue([solved({ lastActiveAt: daysAgo(REVIEW_DEFAULTS.minDaysSince) })], { now: NOW });
  assert.equal(q.length, 1);
  assert.equal(q[0].kind, "solved");
  assert.equal(q[0].tier, 2);
});

test("a solve far outside the window is no longer nagged about", () => {
  const q = buildReviewQueue([solved({ lastActiveAt: daysAgo(REVIEW_DEFAULTS.maxDaysSince + 1) })], { now: NOW });
  assert.equal(q.length, 0);
});

test("a solve at the far edge of the window still qualifies (inclusive)", () => {
  const q = buildReviewQueue([solved({ lastActiveAt: daysAgo(REVIEW_DEFAULTS.maxDaysSince) })], { now: NOW });
  assert.equal(q.length, 1);
});

test("harder problems rank above easier ones at the same age", () => {
  const q = buildReviewQueue(
    [
      solved({ id: "easy", title: "Easy One", difficulty: "Easy", lastActiveAt: daysAgo(20) }),
      solved({ id: "hard", title: "Hard One", difficulty: "Hard", lastActiveAt: daysAgo(20) }),
      solved({ id: "med", title: "Med One", difficulty: "Medium", lastActiveAt: daysAgo(20) }),
    ],
    { now: NOW }
  );
  assert.deepEqual(q.map((i) => i.id), ["hard", "med", "easy"]);
});

test("an older solve of the same difficulty ranks above a younger one", () => {
  const q = buildReviewQueue(
    [
      solved({ id: "young", title: "Young", difficulty: "Medium", lastActiveAt: daysAgo(5) }),
      solved({ id: "old", title: "Old", difficulty: "Medium", lastActiveAt: daysAgo(35) }),
    ],
    { now: NOW }
  );
  assert.deepEqual(q.map((i) => i.id), ["old", "young"]);
});

test("a red flag always outranks a yellow flag, which outranks re-queues", () => {
  const q = buildReviewQueue(
    [
      solved({ id: "requeue", title: "Requeue", difficulty: "Hard", lastActiveAt: daysAgo(40) }),
      flagged({ id: "yellow", flagLevel: "yellow", lastActiveAt: daysAgo(3) }),
      flagged({ id: "red", flagLevel: "red", lastActiveAt: daysAgo(30) }),
    ],
    { now: NOW }
  );
  assert.deepEqual(q.map((i) => i.id), ["red", "yellow", "requeue"]);
  assert.deepEqual(q.map((i) => i.tier), [0, 1, 2]);
});

test("a target flagged 'none' is not a flag and is ignored", () => {
  const q = buildReviewQueue([flagged({ flagLevel: "none" })], { now: NOW });
  assert.equal(q.length, 0);
});

test("a missing flag level on a flagged candidate is ignored", () => {
  const q = buildReviewQueue([{ id: "f", title: "F", kind: "flagged", lastActiveAt: daysAgo(5) }], { now: NOW });
  assert.equal(q.length, 0);
});

test("items with an invalid timestamp are skipped, not fatal", () => {
  const q = buildReviewQueue(
    [solved({ id: "bad", lastActiveAt: "not-a-date" }), solved({ id: "good", lastActiveAt: daysAgo(10) })],
    { now: NOW }
  );
  assert.deepEqual(q.map((i) => i.id), ["good"]);
});

test("future-dated items are treated as not yet relevant", () => {
  const q = buildReviewQueue([solved({ lastActiveAt: daysAgo(-3) })], { now: NOW });
  assert.equal(q.length, 0);
});

test("limit caps the queue but keeps the highest priority first", () => {
  const q = buildReviewQueue(
    [
      solved({ id: "a", title: "A", difficulty: "Easy", lastActiveAt: daysAgo(10) }),
      solved({ id: "b", title: "B", difficulty: "Hard", lastActiveAt: daysAgo(10) }),
      solved({ id: "c", title: "C", difficulty: "Medium", lastActiveAt: daysAgo(10) }),
    ],
    { now: NOW, limit: 2 }
  );
  assert.equal(q.length, 2);
  assert.deepEqual(q.map((i) => i.id), ["b", "c"]);
});

test("the reason string is a fact about the recorded data", () => {
  const q = buildReviewQueue([solved({ title: "Two Sum", difficulty: "Hard", lastActiveAt: daysAgo(12) })], { now: NOW });
  assert.equal(q.length, 1);
  assert.match(q[0].reason, /Solved 12 days ago \(Hard\)/);
});

test("daysSince uses whole local days (yesterday = 1)", () => {
  const q = buildReviewQueue([solved({ lastActiveAt: daysAgo(3) })], { now: NOW });
  assert.equal(q[0].daysSince, 3);
});

test("empty input yields an empty queue", () => {
  assert.deepEqual(buildReviewQueue([], { now: NOW }), []);
});

test("reviewQueueCounts splits flagged from re-queue", () => {
  const q = buildReviewQueue(
    [
      flagged({ id: "r", flagLevel: "red", lastActiveAt: daysAgo(2) }),
      flagged({ id: "y", flagLevel: "yellow", lastActiveAt: daysAgo(2) }),
      solved({ id: "s", difficulty: "Hard", lastActiveAt: daysAgo(15) }),
    ],
    { now: NOW }
  );
  assert.deepEqual(reviewQueueCounts(q), { flagged: 2, requeue: 1 });
});

test("the default window is what the docs claim", () => {
  assert.equal(REVIEW_DEFAULTS.minDaysSince, 2);
  assert.equal(REVIEW_DEFAULTS.maxDaysSince, 45);
});
