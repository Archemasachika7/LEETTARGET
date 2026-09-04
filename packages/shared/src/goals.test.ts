import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Goal } from "./types.ts";
import {
  daysUntil,
  describeGoal,
  formatCountdown,
  parseLocalDate,
  sortGoalsByUrgency,
  summariseGoal,
} from "./goals.ts";

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    userId: "u1",
    track: "gate",
    title: "GATE",
    targetDate: "2027-02-07",
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

test("parseLocalDate reads a date as local midnight, not UTC", () => {
  const d = parseLocalDate("2027-02-07");
  // Read back through local getters: the calendar date must survive whatever
  // timezone the test runs in, which a UTC parse would not guarantee.
  assert.equal(d.getFullYear(), 2027);
  assert.equal(d.getMonth(), 1);
  assert.equal(d.getDate(), 7);
});

test("daysUntil counts calendar days, and goes negative after the date", () => {
  const now = new Date(2026, 7, 29); // 29 Aug 2026, local
  assert.equal(daysUntil("2026-08-29", now), 0);
  assert.equal(daysUntil("2026-08-30", now), 1);
  assert.equal(daysUntil("2026-09-28", now), 30);
  assert.equal(daysUntil("2026-08-27", now), -2);
});

test("daysUntil is unaffected by the time of day", () => {
  const morning = new Date(2026, 7, 29, 6, 0);
  const lateNight = new Date(2026, 7, 29, 23, 59);
  assert.equal(daysUntil("2026-09-05", morning), daysUntil("2026-09-05", lateNight));
});

test("formatCountdown switches units where precision stops helping", () => {
  assert.equal(formatCountdown(0), "Today");
  assert.equal(formatCountdown(1), "Tomorrow");
  assert.equal(formatCountdown(12), "12 days");
  assert.equal(formatCountdown(35), "5 weeks");
  assert.equal(formatCountdown(180), "6 months");
  assert.equal(formatCountdown(-3), "3d ago");
});

test("a goal with no targetCount gets a countdown and no invented pace", () => {
  const now = new Date(2026, 7, 29);
  const s = summariseGoal(goal(), 0, now);
  assert.equal(s.pace, "untracked");
  assert.equal(s.percent, undefined);
  assert.equal(s.remaining, undefined);
  assert.equal(s.requiredPerDay, undefined);
  assert.ok(s.daysLeft > 0);
});

test("pace is judged against elapsed time, not a flat quota", () => {
  // 100-day goal, 50 days elapsed: half the calendar is spent, so half the
  // work is the on-track line.
  const g = goal({ targetDate: "2026-11-09", targetCount: 100, createdAt: "2026-08-01T00:00:00.000Z" });
  const now = new Date(2026, 8, 20); // 20 Sep 2026 — 50 days in

  assert.equal(summariseGoal(g, 50, now).pace, "on-track");
  assert.equal(summariseGoal(g, 20, now).pace, "behind");
  assert.equal(summariseGoal(g, 80, now).pace, "ahead");
});

test("hitting the target reads as done, whatever the calendar says", () => {
  const g = goal({ targetCount: 40, targetDate: "2027-02-07" });
  const s = summariseGoal(g, 40, new Date(2026, 7, 29));
  assert.equal(s.pace, "done");
  assert.equal(s.remaining, 0);
  assert.equal(s.percent, 100);
  assert.equal(s.requiredPerDay, 0);
});

test("an unfinished goal past its date is overdue, not just behind", () => {
  const g = goal({ targetCount: 40, targetDate: "2026-08-01" });
  const s = summariseGoal(g, 10, new Date(2026, 7, 29));
  assert.equal(s.pace, "overdue");
  assert.equal(s.remaining, 30);
});

test("required rate never divides by zero on the deadline itself", () => {
  const g = goal({ targetCount: 10, targetDate: "2026-08-29", createdAt: "2026-08-01T00:00:00.000Z" });
  const s = summariseGoal(g, 4, new Date(2026, 7, 29));
  assert.equal(s.daysLeft, 0);
  assert.equal(s.remaining, 6);
  assert.ok(Number.isFinite(s.requiredPerDay!));
  assert.equal(s.requiredPerDay, 6); // the whole remainder is owed today
});

test("percent is capped at 100 when the target is overshot", () => {
  const g = goal({ targetCount: 20 });
  const s = summariseGoal(g, 27, new Date(2026, 7, 29));
  assert.equal(s.percent, 100);
  assert.equal(s.remaining, 0);
});

test("describeGoal reports a weekly rate when a daily one would be misleading", () => {
  // 6 items across ~160 days is well under one a day.
  const g = goal({ targetCount: 6, targetDate: "2027-02-07", createdAt: "2026-08-01T00:00:00.000Z" });
  const now = new Date(2026, 7, 29);
  const text = describeGoal(g, summariseGoal(g, 0, now));
  assert.match(text, /\/week/);
  assert.doesNotMatch(text, /\/day/);
});

test("sortGoalsByUrgency puts the soonest first and sinks passed dates", () => {
  const now = new Date(2026, 7, 29);
  const sorted = sortGoalsByUrgency(
    [
      goal({ id: "far", targetDate: "2027-02-07" }),
      goal({ id: "passed", targetDate: "2026-06-01" }),
      goal({ id: "soon", targetDate: "2026-09-10" }),
    ],
    now
  );
  assert.deepEqual(sorted.map((g) => g.id), ["soon", "far", "passed"]);
});
