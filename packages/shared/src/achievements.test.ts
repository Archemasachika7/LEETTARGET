import assert from "node:assert/strict";
import { test } from "node:test";
// Explicit ".ts" so `node --test` resolves it — see the tsconfig note.
import { achievements, earnedCount, type AchievementInput } from "./achievements.ts";

const EMPTY: AchievementInput = {
  totalSolved: 0,
  easySolved: 0,
  mediumSolved: 0,
  hardSolved: 0,
  longestStreak: 0,
  targetsDone: 0,
  targetsTotal: 0,
};

function byId(input: AchievementInput, id: string) {
  const found = achievements(input).find((a) => a.id === id);
  assert.ok(found, `expected an achievement with id "${id}"`);
  return found;
}

test("a brand-new user has earned nothing", () => {
  assert.equal(earnedCount(achievements(EMPTY)), 0, "no participation badges on day one");
});

test("the first solve earns exactly one achievement", () => {
  const list = achievements({ ...EMPTY, totalSolved: 1, easySolved: 1 });
  assert.equal(earnedCount(list), 1);
  assert.equal(list.find((a) => a.earned)?.id, "first-blood");
});

test("count achievements report progress toward their goal", () => {
  const a = byId({ ...EMPTY, totalSolved: 7 }, "ten-solved");
  assert.equal(a.earned, false);
  assert.deepEqual(a.progress, { current: 7, goal: 10 });
});

test("progress is clamped so an overshoot doesn't read past the goal", () => {
  const a = byId({ ...EMPTY, totalSolved: 500 }, "ten-solved");
  assert.deepEqual(a.progress, { current: 10, goal: 10 }, "10/10, not 500/10");
});

test("difficulty achievements count only their own tier", () => {
  const onlyEasy = { ...EMPTY, totalSolved: 40, easySolved: 40 };
  assert.equal(byId(onlyEasy, "medium-25").earned, false, "40 Easy solves is not a Medium breakthrough");
  assert.equal(byId(onlyEasy, "first-hard").earned, false);

  const withMediums = { ...EMPTY, totalSolved: 40, mediumSolved: 25 };
  assert.equal(byId(withMediums, "medium-25").earned, true);
});

test("streak achievements use the longest streak, not the current one", () => {
  assert.equal(byId({ ...EMPTY, longestStreak: 7 }, "week-streak").earned, true);
  assert.equal(byId({ ...EMPTY, longestStreak: 6 }, "week-streak").earned, false);
  assert.equal(byId({ ...EMPTY, longestStreak: 30 }, "month-streak").earned, true);
});

test("the list-clearing achievement only exists once there is a list", () => {
  assert.equal(
    achievements(EMPTY).some((a) => a.id === "list-complete"),
    false,
    "finishing an empty list is not an achievement"
  );

  const withList = { ...EMPTY, targetsTotal: 12, targetsDone: 12 };
  assert.equal(byId(withList, "list-complete").earned, true);
});

test("a partly finished list is not cleared", () => {
  const a = byId({ ...EMPTY, targetsTotal: 12, targetsDone: 11 }, "list-complete");
  assert.equal(a.earned, false);
  assert.deepEqual(a.progress, { current: 11, goal: 12 });
});
