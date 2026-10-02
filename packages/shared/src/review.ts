/** What to revisit, and in what order — the spaced-revision queue.
 *
 * Solving *new* problems is the easy half of deliberate practice. The half
 * that actually moves retention is going back over problems you've already
 * solved, while they're still in the "just about to fade" window. This module
 * answers the one question the rest of the app doesn't: **"what should I
 * re-do today?"**
 *
 * It is deliberately built only from data the app already records —
 * `solved_at` timestamps and the yellow/red "this was tricky" flags a user
 * puts on a target. There is no accuracy, no attempt count, no timing, and no
 * invented recall model: LeetCode's public API reports accepted submissions
 * only, so any of those would be guesswork. A problem that was solved N days
 * ago is a candidate to re-do *because it has been N days*, full stop.
 *
 * Pure and tested here (see `review.test.ts`) rather than in the web app, for
 * the same reason as `progress.ts` and `goals.ts`: the ordering and the
 * day-window are fiddly, and they deserve to be pinned down away from React.
 *
 * Everything is judged in the *viewer's local time*: "12 days ago" means 12
 * local midnights, so a solve at 11pm doesn't age a day early for a user west
 * of UTC. */

import type { Problem, TargetFlagLevel } from "./types.js";

/** A thing the queue can consider. `solved` rows come from a user's
 * `solved_problems`; `flagged` rows come from targets the user marked
 * yellow/red ("this was harder than it looked"). */
export interface ReviewCandidate {
  id: string;
  title: string;
  url?: string;
  /** Only meaningful for `solved` rows — used to weight harder problems,
   * which are worth more of a re-do and fade from memory faster. */
  difficulty?: Problem["difficulty"];
  kind: "solved" | "flagged";
  /** Only for `kind: "flagged"`. A `"none"` flag means "not actually
   * flagged" and the candidate is ignored. */
  flagLevel?: TargetFlagLevel;
  /** When the item last earned review attention — the solve's `solved_at`,
   * or the target's `created_at` (a flag's meaning is "still think about
   * this", so its own creation is the honest reference point). */
  lastActiveAt: string;
}

/** One line of the queue, with the plain-language reason it's there. */
export interface ReviewQueueItem {
  id: string;
  title: string;
  url?: string;
  difficulty?: Problem["difficulty"];
  kind: "solved" | "flagged";
  flagLevel?: TargetFlagLevel;
  /** Whole local days since `lastActiveAt`. */
  daysSince: number;
  /** 0 = red flag, 1 = yellow flag, 2 = in the revisit window. Lower first. */
  tier: 0 | 1 | 2;
  /** Why it's on the queue, in one sentence — always a statement of fact. */
  reason: string;
  /** Higher = more worth revisiting. Within a tier, this is the ordering. */
  score: number;
}

export interface ReviewOptions {
  /** Injectable clock for tests. Defaults to `new Date()`. */
  now?: Date;
  /** A solve older than this is no longer nagged about — past the window it's
   * either mastered or the user has moved on, and re-doing a 6-month-old easy
   * problem is low value. */
  maxDaysSince?: number;
  /** A solve younger than this isn't worth a re-do yet — you did it last
   * night. Defaults to 2 so "yesterday" and "the day before" stay quiet. */
  minDaysSince?: number;
  /** Cap the returned queue. `undefined` = no cap (the UI trims for display). */
  limit?: number;
}

export const REVIEW_DEFAULTS = { maxDaysSince: 45, minDaysSince: 2 } as const;

const DIFFICULTY_WEIGHT: Record<Problem["difficulty"], number> = {
  Hard: 3,
  Medium: 2,
  Easy: 1,
  Unknown: 1,
};

/** Whole local days between `from` and `to`, matching the convention in
 * `progress.ts` (compare UTC-normalised day indices, never millisecond
 * subtraction, so a DST change can't round the answer off by one). */
function localDaysSince(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

function parseIso(iso: string): Date | undefined {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Builds the "review today" queue from a mix of solved problems and flagged
 * targets.
 *
 * Priority, and it is explainable in one line:
 *  1. **Red-flagged** targets — the user said "this hurt, revisit it".
 *  2. **Yellow-flagged** targets — "this was a bit tricky".
 *  3. **Solved problems in the revisit window** (`minDaysSince`..
 *     `maxDaysSince` days old), hardest and oldest first.
 *
 * Within tier 3, a problem's score is `difficulty weight × how far into the
 * window it is` — a Hard solved 40 days ago beats an Easy solved 3 days ago,
 * which is the order a re-do session actually wants. Ties break on recency,
 * then title, so the output is deterministic.
 */
export function buildReviewQueue(
  candidates: ReviewCandidate[],
  options: ReviewOptions = {}
): ReviewQueueItem[] {
  const now = options.now ?? new Date();
  const minDays = options.minDaysSince ?? REVIEW_DEFAULTS.minDaysSince;
  const maxDays = options.maxDaysSince ?? REVIEW_DEFAULTS.maxDaysSince;

  const items: ReviewQueueItem[] = [];

  for (const c of candidates) {
    const at = parseIso(c.lastActiveAt);
    if (!at) continue; // no trustworthy timestamp — nothing honest to say
    const daysSince = localDaysSince(at, now);
    if (daysSince < 0) continue; // future-dated; treat as not yet relevant

    if (c.kind === "flagged") {
      if (c.flagLevel === "red") {
        items.push({
          ...c,
          daysSince,
          tier: 0,
          reason:
            daysSince === 0
              ? "Flagged as tricky today — re-do it while it's fresh."
              : `Flagged as tricky ${daysSince} day${daysSince === 1 ? "" : "s"} ago.`,
          score: 1,
        });
      } else if (c.flagLevel === "yellow") {
        items.push({
          ...c,
          daysSince,
          tier: 1,
          reason: `Flagged as a bit tricky ${daysSince} day${daysSince === 1 ? "" : "s"} ago.`,
          score: 1,
        });
      }
      // "none" (or missing) = not a flag; skip.
    } else {
      // A solve is a re-do candidate only inside the window.
      if (daysSince < minDays || daysSince > maxDays) continue;
      const weight = DIFFICULTY_WEIGHT[c.difficulty ?? "Unknown"];
      // 0..1 through the window; a solve right at the far edge is the most
      // worth revisiting. Multiply by difficulty so Hard floats to the top.
      const progress = maxDays > minDays ? (daysSince - minDays) / (maxDays - minDays) : 1;
      const diffLabel = c.difficulty ?? "Unknown";
      items.push({
        ...c,
        daysSince,
        tier: 2,
        reason: `Solved ${daysSince} day${daysSince === 1 ? "" : "s"} ago (${diffLabel}) — re-do it before it fades.`,
        score: weight * progress,
      });
    }
  }

  items.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (b.score !== a.score) return b.score - a.score;
    if (b.daysSince !== a.daysSince) return b.daysSince - a.daysSince;
    return a.title.localeCompare(b.title);
  });

  return options.limit !== undefined ? items.slice(0, options.limit) : items;
}

/** How many items in the queue are each kind — for the card's little
 * "N flagged · M to re-do" summary line. */
export function reviewQueueCounts(items: ReviewQueueItem[]): { flagged: number; requeue: number } {
  return {
    flagged: items.filter((i) => i.kind === "flagged").length,
    requeue: items.filter((i) => i.kind === "solved").length,
  };
}
