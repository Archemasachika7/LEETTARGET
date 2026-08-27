/** Progress arithmetic over solve timestamps.
 *
 * Kept here rather than in the web app because it's pure, non-trivial and
 * worth testing on its own — and because the extension may eventually want
 * the same streak number in its popup.
 *
 * Everything works in the *viewer's local time*: a streak is a human "did I
 * practise today" idea, so a solve at 11pm local should count for that local
 * day, not for whatever UTC day it lands in. */

/** Days since the epoch for a date, in local time. Comparing these integers
 * avoids the DST trap of adding 86,400,000ms to a timestamp — on a
 * clock-change day that lands on the wrong date. */
function localDayIndex(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
}

/** Local-time `YYYY-MM-DD` — used as a stable grouping key for activity. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local midnight at the start of the ISO week (Monday) containing `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay(): 0 = Sunday. Shift so Monday is 0 and Sunday is 6.
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export interface StreakSummary {
  /** Consecutive days practised, counting back from today. */
  current: number;
  /** Best run ever recorded. */
  longest: number;
  /** Distinct days with at least one solve. */
  activeDays: number;
  solvedToday: number;
  solvedThisWeek: number;
}

/** Computes streak/activity figures from raw solve timestamps.
 *
 * A streak counts *days practised*, not solves, so five problems in one
 * evening is one day. Today counts as soon as anything is solved, but an
 * empty today does **not** immediately break the streak — the run is measured
 * from yesterday while the day is still in progress, otherwise every user's
 * streak would read 0 each morning until they solved something. */
export function summariseStreaks(solvedAt: (string | Date)[], now: Date = new Date()): StreakSummary {
  const dayCounts = new Map<number, number>();
  for (const raw of solvedAt) {
    const date = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(date.getTime())) continue;
    const day = localDayIndex(date);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  const days = [...dayCounts.keys()].sort((a, b) => a - b);
  if (days.length === 0) {
    return { current: 0, longest: 0, activeDays: 0, solvedToday: 0, solvedThisWeek: 0 };
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const today = localDayIndex(now);
  const practisedToday = dayCounts.has(today);
  // Anchor on today if it's already been practised, otherwise on yesterday —
  // the day isn't over yet, so its emptiness proves nothing.
  let cursor = practisedToday ? today : today - 1;
  let current = 0;
  while (dayCounts.has(cursor)) {
    current++;
    cursor--;
  }

  const weekStart = localDayIndex(startOfWeek(now));
  let solvedThisWeek = 0;
  for (const [day, count] of dayCounts) {
    if (day >= weekStart && day <= today) solvedThisWeek += count;
  }

  return {
    current,
    longest,
    activeDays: days.length,
    solvedToday: dayCounts.get(today) ?? 0,
    solvedThisWeek,
  };
}

/** Solve counts per local day for the last `days` days, oldest first — the
 * shape an activity strip renders directly. */
export function dailyActivity(
  solvedAt: (string | Date)[],
  days = 14,
  now: Date = new Date()
): { key: string; date: Date; count: number }[] {
  const counts = new Map<string, number>();
  for (const raw of solvedAt) {
    const date = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(date.getTime())) continue;
    const key = localDayKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const out: { key: string; date: Date; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = localDayKey(date);
    out.push({ key, date, count: counts.get(key) ?? 0 });
  }
  return out;
}

/** Streak lengths worth marking. Kept short and spaced out — a milestone
 * every few days stops meaning anything. */
export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 365] as const;

/** The next milestone above `current`, or undefined once they're all passed. */
export function nextMilestone(current: number): number | undefined {
  return STREAK_MILESTONES.find((m) => m > current);
}
