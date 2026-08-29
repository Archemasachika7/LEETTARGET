import { summariseStreaks } from "@leettarget/shared";
import type { LeaderboardEntry, SolvedProblem, Target, UserGoals, TopicMastery } from "@leettarget/shared";
import type { StuckItem, StudyTrack } from "../studyDesk.js";

export interface AssistantContext {
  track: StudyTrack;
  targets: Target[];
  solved: SolvedProblem[];
  goals?: UserGoals;
  focusTopics: TopicMastery[];
  stuckItems: StuckItem[];
  userId: string;
  /** The public leaderboard — every signed-in user with at least one target
   * or solve is already visible on it in the app itself (migration
   * 0004_leaderboard.sql opens SELECT to any authenticated user), so
   * handing it to the assistant isn't exposing anything the reader
   * couldn't already see on the Progress page's leaderboard tab. */
  leaderboard: LeaderboardEntry[];
}

/** Renders the reader's own data into a compact block the model reads as
 * ground truth. Every line comes straight from Supabase or local storage —
 * nothing here is a number the model could then misremember or embellish,
 * and tracks with no data yet say so instead of being padded out. */
export function buildContextSummary(ctx: AssistantContext): string {
  const { track, targets, solved, goals, focusTopics, stuckItems, userId, leaderboard } = ctx;
  const lines: string[] = [`Active track: ${track}.`];

  if (track === "leetcode") {
    const streaks = summariseStreaks(solved.map((s) => s.solvedAt));
    const done = targets.filter((t) => t.status === "done").length;
    lines.push(`${solved.length} problems solved in total.`);
    lines.push(`${done} of ${targets.length} targets marked done, ${targets.length - done} pending.`);
    lines.push(`Current streak: ${streaks.current} day(s). Longest streak: ${streaks.longest} day(s).`);
    lines.push(`Solved today: ${streaks.solvedToday}. Solved this week: ${streaks.solvedThisWeek}.`);
    lines.push(
      goals
        ? `Daily target: ${goals.dailyTarget}. Weekly target: ${goals.weeklyTarget}.`
        : "No daily/weekly target has been set yet."
    );
    lines.push(
      focusTopics.length > 0
        ? `Weakest topics right now: ${focusTopics.map((t) => `${t.topic} (${t.strength})`).join(", ")}.`
        : "No topic data yet — problems haven't been analysed for topic tags."
    );
    lines.push(
      "Not tracked and never invent a value for: accuracy, attempt counts, success rate, solve time — LeetCode's public API only reports accepted submissions."
    );

    if (leaderboard.length > 0) {
      const rank = leaderboard.findIndex((e) => e.userId === userId) + 1;
      lines.push(
        rank > 0
          ? `Leaderboard rank: ${rank} of ${leaderboard.length}, by problems solved.`
          : `Leaderboard: ${leaderboard.length} people on it; not ranked yet (no targets or solves recorded).`
      );
      const top = leaderboard
        .slice(0, 8)
        .map((e, i) => `${i + 1}. ${e.displayName ?? "unnamed"}${e.userId === userId ? " (you)" : ""} — ${e.solvedCount} solved`);
      lines.push(`Leaderboard, top ${top.length}: ${top.join("; ")}.`);
    } else {
      lines.push("Leaderboard: empty — no one has any targets or solves recorded yet.");
    }
  } else {
    const stuck = stuckItems.filter((i) => i.status === "stuck").length;
    const revisit = stuckItems.filter((i) => i.status === "revisit").length;
    const cleared = stuckItems.filter((i) => i.status === "cleared").length;
    lines.push(`${stuckItems.length} item(s) on the ${track.toUpperCase()} stuck desk.`);
    lines.push(`${stuck} still stuck, ${revisit} flagged to revisit, ${cleared} cleared.`);
    if (stuckItems.length > 0) {
      const bySubject = new Map<string, number>();
      for (const item of stuckItems) bySubject.set(item.subject, (bySubject.get(item.subject) ?? 0) + 1);
      const top = [...bySubject.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      lines.push(`By subject: ${top.map(([s, n]) => `${s} (${n})`).join(", ")}.`);
    }
  }

  return lines.join("\n");
}
