/** Topic mastery and focus areas, derived from LeetCode's own topic tags.
 *
 * Every figure here is a ratio of *solved to seen*, where "seen" means "in
 * this user's own problem set" (their targets plus what they've solved). It
 * deliberately does **not** claim mastery of a topic in the abstract: without
 * accuracy or timing data, LeetTarget can only say how much of the reader's
 * own list they've worked through, and the labels below are worded to mean
 * exactly that. */

export interface TopicProblem {
  slug: string;
  topics: string[];
  solved: boolean;
}

export type TopicStrength = "strong" | "steady" | "starting" | "untouched";

export interface TopicMastery {
  topic: string;
  solved: number;
  total: number;
  /** Solved ÷ total, 0–1. */
  ratio: number;
  strength: TopicStrength;
}

function strengthFor(solved: number, total: number): TopicStrength {
  if (solved === 0) return "untouched";
  const ratio = solved / total;
  if (ratio >= 0.75) return "strong";
  if (ratio >= 0.4) return "steady";
  return "starting";
}

/** Human wording for each strength band. Kept next to the thresholds so the
 * label and the maths can't drift apart. */
export const STRENGTH_LABEL: Record<TopicStrength, string> = {
  strong: "Strong",
  steady: "Steady",
  starting: "Starting",
  untouched: "Not started",
};

/** Rolls a problem set up by topic. A problem tagged with three topics counts
 * once toward each — LeetCode tags are not exclusive, and splitting the
 * credit would understate every topic. */
export function topicMastery(problems: TopicProblem[], minimumProblems = 1): TopicMastery[] {
  const totals = new Map<string, { solved: number; total: number }>();

  for (const problem of problems) {
    for (const topic of new Set(problem.topics)) {
      const entry = totals.get(topic) ?? { solved: 0, total: 0 };
      entry.total += 1;
      if (problem.solved) entry.solved += 1;
      totals.set(topic, entry);
    }
  }

  return [...totals.entries()]
    .filter(([, v]) => v.total >= minimumProblems)
    .map(([topic, v]) => ({
      topic,
      solved: v.solved,
      total: v.total,
      ratio: v.total > 0 ? v.solved / v.total : 0,
      strength: strengthFor(v.solved, v.total),
    }))
    .sort((a, b) => b.total - a.total || a.topic.localeCompare(b.topic));
}

/** Topics with the most unsolved problems still sitting in the reader's own
 * list — i.e. where the most work remains, which is a fact, rather than
 * "where you are weakest", which would need accuracy data this app doesn't
 * have. Requires a few problems in the topic before it's worth surfacing, so
 * a single stray tag doesn't become a "focus area". */
export function focusAreas(mastery: TopicMastery[], limit = 4, minimumProblems = 3): TopicMastery[] {
  return mastery
    .filter((m) => m.total >= minimumProblems && m.solved < m.total)
    .sort((a, b) => b.total - b.solved - (a.total - a.solved) || a.ratio - b.ratio)
    .slice(0, limit);
}
