/** Achievements, derived from records the app already keeps.
 *
 * Every one is tied to a real quantity — problems solved, difficulty mix,
 * streak length, targets completed. There are deliberately no participation
 * badges ("opened the app", "set a goal"): a badge that everyone gets on day
 * one makes the ones that took months mean less. */

export interface AchievementInput {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  longestStreak: number;
  targetsDone: number;
  targetsTotal: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  /** Progress toward earning it, for the ones that are a count. Absent where
   * "progress" would be meaningless. */
  progress?: { current: number; goal: number };
}

/** Ordered roughly by when a practising user would reach them, so the list
 * reads as a path rather than a grid of unrelated trophies. */
export function achievements(input: AchievementInput): Achievement[] {
  const count = (
    id: string,
    name: string,
    description: string,
    current: number,
    goal: number
  ): Achievement => ({
    id,
    name,
    description,
    earned: current >= goal,
    progress: { current: Math.min(current, goal), goal },
  });

  const list: Achievement[] = [
    count("first-blood", "First blood", "Record your first solved problem.", input.totalSolved, 1),
    count("ten-solved", "Getting going", "Solve 10 problems.", input.totalSolved, 10),
    count("week-streak", "Seven straight", "Practise seven days in a row.", input.longestStreak, 7),
    count("medium-25", "Medium breakthrough", "Solve 25 Medium problems.", input.mediumSolved, 25),
    count("fifty-solved", "Half a century", "Solve 50 problems.", input.totalSolved, 50),
    count("first-hard", "Into the deep end", "Solve your first Hard problem.", input.hardSolved, 1),
    count("month-streak", "Thirty straight", "Practise thirty days in a row.", input.longestStreak, 30),
    count("hundred-solved", "Century", "Solve 100 problems.", input.totalSolved, 100),
  ];

  // Only meaningful once a list exists — "finish your list" is not an
  // achievement when there's nothing on it.
  if (input.targetsTotal > 0) {
    list.splice(2, 0, {
      id: "list-complete",
      name: "List cleared",
      description: "Finish every target on your list.",
      earned: input.targetsDone >= input.targetsTotal,
      progress: { current: input.targetsDone, goal: input.targetsTotal },
    });
  }

  return list;
}

export function earnedCount(list: Achievement[]): number {
  return list.filter((a) => a.earned).length;
}
