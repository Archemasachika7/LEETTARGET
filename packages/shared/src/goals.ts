/** Goal arithmetic: deadlines, pace, and whether you're actually on track.
 *
 * This is the piece that makes an exam date mean something. A countdown alone
 * is just anxiety — "142 days to GATE" tells you nothing about whether to be
 * worried. What tells you that is comparing the work done against the work the
 * calendar has already spent, which is what `summariseGoal` computes.
 *
 * Pure and tested here rather than in the web app for the same reason as
 * `progress.ts`: the maths is fiddly (dates, division by zero, goals with no
 * count at all) and deserves to be pinned down away from React.
 *
 * Everything works in the viewer's *local* time. A deadline is a human date on
 * a human calendar — "the exam is on the 7th" — so it must not shift by a day
 * because the viewer is west of UTC. */

import type { Goal, GoalPace, GoalSummary } from "./types.js";

/** Parses a `YYYY-MM-DD` date as *local* midnight.
 *
 * `new Date("2027-02-07")` is parsed as UTC midnight by spec, which in any
 * negative-offset timezone is the evening of the 6th locally — so a naive
 * parse makes every deadline read one day early for a third of the world. */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Local-midnight-to-local-midnight day count. Compares day indices rather
 * than subtracting milliseconds, so a DST change inside the range can't round
 * the answer off by one. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** Days from today until `targetDate`. Negative once the date has passed;
 * 0 on the day itself. */
export function daysUntil(targetDate: string, now: Date = new Date()): number {
  return daysBetween(now, parseLocalDate(targetDate));
}

/** Human phrasing for a countdown. Deliberately switches to weeks/months only
 * when the day count stops being something you can hold in your head — "142
 * days" is precise but "20 weeks" is what you actually plan against. */
export function formatCountdown(days: number): string {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 21) return `${days} days`;
  if (days < 90) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30.44)} months`;
}

/** Where a goal stands, with the pace it implies.
 *
 * `completed` is whatever counts as progress for that goal's track — solves
 * for LeetCode, cleared revision items for GATE/CAT. The caller owns that
 * definition; this only does the arithmetic.
 *
 * Pace is judged against *elapsed calendar time*, not against a flat daily
 * quota: a goal set 90 days ago with 30 days left should expect ~75% done, and
 * saying "behind" to someone at 74% on day one would be nonsense. Goals with
 * no `targetCount` (a pure "the exam is on this date" marker) get a countdown
 * and nothing else — inventing a pace for them would be making up data. */
export function summariseGoal(goal: Goal, completed: number, now: Date = new Date()): GoalSummary {
  const daysLeft = daysUntil(goal.targetDate, now);
  const overdue = daysLeft < 0;

  // No count means this goal only marks a date. Everything below is about
  // measuring quantity against time, and there's no quantity to measure.
  if (goal.targetCount === undefined) {
    return {
      daysLeft,
      completed,
      remaining: undefined,
      percent: undefined,
      requiredPerDay: undefined,
      requiredPerWeek: undefined,
      expectedByNow: undefined,
      pace: overdue ? "overdue" : "untracked",
    };
  }

  const target = goal.targetCount;
  const remaining = Math.max(0, target - completed);
  const percent = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  const done = remaining === 0;

  // Effort left per remaining day. On the deadline itself (or past it) the
  // whole remainder is owed now, so it isn't divided by anything.
  const effectiveDays = Math.max(1, daysLeft);
  const requiredPerDay = done ? 0 : remaining / effectiveDays;
  const requiredPerWeek = requiredPerDay * 7;

  // How much should be done by now, if the work were spread evenly across the
  // goal's whole span. Guards a zero-length span (created on the deadline).
  const start = parseLocalDate(goal.createdAt.slice(0, 10));
  const totalDays = Math.max(1, daysBetween(start, parseLocalDate(goal.targetDate)));
  const elapsedDays = Math.min(totalDays, Math.max(0, daysBetween(start, now)));
  const expectedByNow = Math.round((target * elapsedDays) / totalDays);

  let pace: GoalPace;
  if (done) pace = "done";
  else if (overdue) pace = "overdue";
  // A 10% band around the expected line: without it the status flickers
  // between "ahead" and "behind" on every single solve, which reads as noise
  // rather than signal.
  else if (completed >= expectedByNow + Math.max(1, target * 0.1)) pace = "ahead";
  else if (completed >= expectedByNow) pace = "on-track";
  else pace = "behind";

  return {
    daysLeft,
    completed,
    remaining,
    percent,
    requiredPerDay,
    requiredPerWeek,
    expectedByNow,
    pace,
  };
}

/** One line of plain language for a goal's state — the sentence the dashboard
 * leads with. Every branch is a statement of fact about recorded data; none of
 * them congratulate or scold. */
export function describeGoal(goal: Goal, summary: GoalSummary): string {
  const { daysLeft, remaining, requiredPerDay, pace } = summary;

  if (pace === "done") return `${goal.title} is complete.`;
  if (pace === "overdue") {
    return remaining === undefined
      ? `${goal.title} was ${formatCountdown(daysLeft).toLowerCase()}.`
      : `Deadline passed with ${remaining} left.`;
  }
  if (pace === "untracked") {
    return daysLeft === 0 ? `${goal.title} is today.` : `${formatCountdown(daysLeft)} until ${goal.title}.`;
  }

  const perDay = requiredPerDay ?? 0;
  // Below one a day, a daily quota is misleading precision — weekly is the
  // honest unit for "one every few days".
  const rate =
    perDay >= 1
      ? `${Math.ceil(perDay)}/day`
      : `${Math.ceil(perDay * 7)}/week`;

  return `${remaining} left in ${formatCountdown(daysLeft).toLowerCase()} — about ${rate}.`;
}

/** Sorts goals the way they should be worked: soonest deadline first, with
 * anything already past the date sinking to the bottom (it can't be planned
 * against any more, only closed out). */
export function sortGoalsByUrgency(goals: Goal[], now: Date = new Date()): Goal[] {
  return [...goals].sort((a, b) => {
    const da = daysUntil(a.targetDate, now);
    const db = daysUntil(b.targetDate, now);
    const aPast = da < 0;
    const bPast = db < 0;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return da - db;
  });
}
