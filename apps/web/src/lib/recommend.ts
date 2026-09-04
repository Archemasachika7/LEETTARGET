import type { Target } from "@leettarget/shared";

export interface Recommendation {
  target: Target;
  /** Why this one surfaced. Shown verbatim to the reader, so it must be a
   * fact about their data — never a guess dressed up as insight. */
  reason: string;
}

/** Picks what to solve next from the user's own pending targets.
 *
 * The signals here are deliberately limited to what the schema actually
 * records: which targets are still pending, when they were added, and where
 * they sit in an uploaded list. Waypoint has no failed-attempt data, no
 * timing data and no per-problem topic tags yet, so it cannot honestly claim
 * "you struggled with this" or "this shores up your weakest topic" — those
 * would be invented. Everything below is checkable against the data.
 *
 * Ordering: oldest targets first. A list uploaded as a roadmap arrives in its
 * intended study order, and `created_at` preserves it — so "next in your list"
 * is both true and usually the right answer. */
export function recommendNext(targets: Target[], limit = 3): Recommendation[] {
  const pending = targets.filter((t) => t.status === "pending");
  if (pending.length === 0) return [];

  // listTargets returns newest-first; the plan order is the reverse.
  const inPlanOrder = [...pending].reverse();
  const total = targets.length;
  const done = total - pending.length;

  return inPlanOrder.slice(0, limit).map((target, i) => ({
    target,
    reason: reasonFor(i, done, total, target),
  }));
}

function reasonFor(index: number, done: number, total: number, target: Target): string {
  if (index === 0) {
    if (done === 0) return "First on your list — a good place to start.";
    const remaining = total - done;
    if (remaining === 1) return "The last one left on your list.";
    return `Next in your list — ${remaining} still to go.`;
  }
  if (target.source === "csv") return "Next in the list you uploaded.";
  return "Still pending on your list.";
}
