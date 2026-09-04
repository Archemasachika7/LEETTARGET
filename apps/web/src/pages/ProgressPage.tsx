import { useEffect, useMemo, useState } from "react";
import { achievements, summariseStreaks } from "@leettarget/shared";
import { useUserData } from "../lib/userData.js";
import { getSolvedByDifficulty, type DifficultyCounts } from "../lib/api.js";
import { DifficultyBreakdown } from "../components/DifficultyBreakdown.js";
import { SolutionMappingTable } from "../components/SolutionMappingTable.js";
import { Leaderboard } from "../components/Leaderboard.js";
import { ProgressSummary } from "../components/ProgressSummary.js";
import { ActivityStrip } from "../components/dashboard/ActivityStrip.js";
import { Achievements } from "../components/Achievements.js";
import { Card, ChoiceGroup, Eyebrow, PageHeader, Stat } from "../ui/index.js";

type View = "overview" | "solutions" | "leaderboard";

/** "How am I doing?" — against your own history (overview, solutions) and
 * against everyone else (leaderboard), as views of one question rather than
 * separate nav entries.
 *
 * Note what's deliberately absent: accuracy, success rate and average solve
 * time. Waypoint has no failed-attempt or timing data — LeetCode's public
 * API returns only accepted submissions — so those figures could only be
 * invented, and an analytics page that makes numbers up is worse than one
 * that shows fewer. */
export function ProgressPage() {
  const { userId, targets, solved, refreshTick } = useUserData();
  const [view, setView] = useState<View>("overview");
  const [counts, setCounts] = useState<DifficultyCounts>();

  useEffect(() => {
    getSolvedByDifficulty(userId)
      .then(setCounts)
      .catch(() => {}); // the rest of the page still works without it
  }, [userId, refreshTick]);

  const streaks = useMemo(() => summariseStreaks(solved.map((s) => s.solvedAt)), [solved]);

  const earned = useMemo(
    () =>
      achievements({
        totalSolved: solved.length,
        easySolved: counts?.easy ?? 0,
        mediumSolved: counts?.medium ?? 0,
        hardSolved: counts?.hard ?? 0,
        longestStreak: streaks.longest,
        targetsDone: targets.filter((t) => t.status === "done").length,
        targetsTotal: targets.length,
      }),
    [solved.length, counts, streaks.longest, targets]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Record"
        title="Progress"
        description="What you've solved, and how it maps to your repo."
        action={
          <ChoiceGroup
            label="Progress view"
            value={view}
            onChange={setView}
            options={[
              { value: "overview", label: "Overview" },
              { value: "solutions", label: "Solutions" },
              { value: "leaderboard", label: "Leaderboard" },
            ]}
          />
        }
      />

      {view === "overview" && (
        <div className="flex flex-col gap-6">
          <ProgressSummary targets={targets} solved={solved} />

          <Card className="stagger grid grid-cols-2 gap-6 p-4 sm:grid-cols-4">
            <Stat label="Current streak" value={streaks.current} sub="days" animate />
            <Stat label="Longest streak" value={streaks.longest} sub="days" animate />
            <Stat label="Active days" value={streaks.activeDays} sub="with a solve" animate />
            <Stat label="This week" value={streaks.solvedThisWeek} sub="solved" animate />
          </Card>

          <div className="stagger grid gap-4 lg:grid-cols-2">
            <DifficultyBreakdown userId={userId} refreshKey={refreshTick} />
            <ActivityStrip solved={solved} />
          </div>

          <Achievements list={earned} />

          <Card className="p-4">
            <Eyebrow>Not shown</Eyebrow>
            <p className="mt-1.5 text-[13px] text-text-muted">
              Accuracy, attempt counts and solve times aren't here because nothing records them — LeetCode's public
              API only reports accepted submissions, so any figure would be guesswork.
            </p>
          </Card>
        </div>
      )}

      {view === "solutions" && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            Where Waypoint thinks each solution lives in your repo — correct it if the guess is wrong.
          </p>
          <SolutionMappingTable userId={userId} refreshKey={refreshTick} />
        </section>
      )}

      {view === "leaderboard" && <Leaderboard currentUserId={userId} />}
    </div>
  );
}
