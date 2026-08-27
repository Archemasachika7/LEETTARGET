import assert from "node:assert/strict";
import { test } from "node:test";
// Imported with an explicit ".ts" extension because `node --test` resolves
// specifiers literally — see the tsconfig note. Source files still use ".js".
import { dailyActivity, nextMilestone, startOfWeek, summariseStreaks } from "./progress.ts";

/** Builds a local-time date at midday, so a test never sits close enough to a
 * day boundary for the local/UTC offset to shift which day it lands on. */
function day(y: number, m: number, d: number, hour = 12): Date {
  return new Date(y, m - 1, d, hour);
}

test("no solves yields an empty summary", () => {
  const s = summariseStreaks([], day(2026, 3, 10));
  assert.deepEqual(s, { current: 0, longest: 0, activeDays: 0, solvedToday: 0, solvedThisWeek: 0 });
});

test("counts days practised, not problems solved", () => {
  const now = day(2026, 3, 10);
  const s = summariseStreaks([day(2026, 3, 10, 9), day(2026, 3, 10, 21), day(2026, 3, 10, 23)], now);
  assert.equal(s.current, 1, "three solves in one evening is still a one-day streak");
  assert.equal(s.solvedToday, 3);
  assert.equal(s.activeDays, 1);
});

test("an unpractised today does not break the streak while the day is still going", () => {
  const now = day(2026, 3, 10);
  // Practised the three days up to yesterday, nothing yet today.
  const s = summariseStreaks([day(2026, 3, 7), day(2026, 3, 8), day(2026, 3, 9)], now);
  assert.equal(s.current, 3, "streak is measured from yesterday until today ends");
  assert.equal(s.solvedToday, 0);
});

test("a missed day does break the streak", () => {
  const now = day(2026, 3, 10);
  // Gap on the 8th.
  const s = summariseStreaks([day(2026, 3, 6), day(2026, 3, 7), day(2026, 3, 9), day(2026, 3, 10)], now);
  assert.equal(s.current, 2, "only the 9th and 10th are consecutive up to today");
  assert.equal(s.longest, 2);
  assert.equal(s.activeDays, 4);
});

test("longest streak survives being in the past", () => {
  const now = day(2026, 3, 20);
  const s = summariseStreaks(
    [day(2026, 3, 1), day(2026, 3, 2), day(2026, 3, 3), day(2026, 3, 4), day(2026, 3, 20)],
    now
  );
  assert.equal(s.longest, 4);
  assert.equal(s.current, 1);
});

test("weekly count covers Monday through today, not a rolling 7 days", () => {
  // 2026-03-10 is a Tuesday; that week starts Monday 2026-03-09.
  const now = day(2026, 3, 10);
  assert.equal(startOfWeek(now).getDate(), 9);

  const s = summariseStreaks(
    [
      day(2026, 3, 8), // Sunday — previous week, excluded
      day(2026, 3, 9), // Monday — counted
      day(2026, 3, 10), // Tuesday (today) — counted
      day(2026, 3, 10),
    ],
    now
  );
  assert.equal(s.solvedThisWeek, 3);
});

test("a Sunday belongs to the week that began the preceding Monday", () => {
  // 2026-03-15 is a Sunday.
  const sunday = day(2026, 3, 15);
  assert.equal(startOfWeek(sunday).getDate(), 9, "Sunday closes the week, it doesn't open one");
});

test("dailyActivity returns one oldest-first bucket per day, zeros included", () => {
  const now = day(2026, 3, 10);
  const activity = dailyActivity([day(2026, 3, 10), day(2026, 3, 10), day(2026, 3, 8)], 4, now);

  assert.equal(activity.length, 4);
  assert.deepEqual(
    activity.map((a) => a.count),
    [0, 1, 0, 2],
    "7th: none, 8th: one, 9th: none, 10th: two"
  );
  assert.equal(activity[activity.length - 1].key, "2026-03-10");
});

test("invalid timestamps are ignored rather than throwing", () => {
  const s = summariseStreaks(["not a date", day(2026, 3, 10).toISOString()], day(2026, 3, 10));
  assert.equal(s.activeDays, 1);
});

test("nextMilestone finds the next rung, and runs out at the top", () => {
  assert.equal(nextMilestone(0), 7);
  assert.equal(nextMilestone(7), 14);
  assert.equal(nextMilestone(31), 50);
  assert.equal(nextMilestone(365), undefined);
});
