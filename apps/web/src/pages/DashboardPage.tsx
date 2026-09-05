import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ListChecks } from "lucide-react";
import { summariseStreaks, type UserGoals } from "@leettarget/shared";
import { useUserData } from "../lib/userData.js";
import { useTopics } from "../lib/useTopics.js";
import { useGoals } from "../lib/useGoals.js";
import { useStudyDesk } from "../lib/studyDesk.js";
import { getUserGoals } from "../lib/api.js";
import { GoalDeck } from "../components/goals/GoalDeck.js";
import { recommendNext } from "../lib/recommend.js";
import { ProgressSummary } from "../components/ProgressSummary.js";
import { DifficultyBreakdown } from "../components/DifficultyBreakdown.js";
import { ImportLeetCode } from "../components/ImportLeetCode.js";
import { TargetsTable } from "../components/TargetsTable.js";
import { NextTarget } from "../components/dashboard/NextTarget.js";
import { NoGoalsCard, TodayCard } from "../components/dashboard/TodayCard.js";
import { ActivityStrip } from "../components/dashboard/ActivityStrip.js";
import { FocusAreas } from "../components/dashboard/FocusAreas.js";
import { GoalsForm } from "../components/dashboard/GoalsForm.js";
import { StudyTrackDashboard } from "../components/study/StudyTrackDashboard.js";
import { Button, Card, EmptyState, PageHeader, Reveal, SectionHeader, Skeleton, SkeletonRows } from "../ui/index.js";

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** The dashboard answers one question above all: what should I do today?
 *
 * Order matters here — status, then the single most actionable thing, then
 * the numbers that justify it, then history. Anything that isn't part of that
 * narrative (managing the target list, configuring integrations) lives on
 * another route rather than competing for attention. */
export function DashboardPage() {
  const { mode } = useStudyDesk();
  const { userId, targets, solved, refreshTick, refresh, loading } = useUserData();
  const [goals, setGoals] = useState<UserGoals>();
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const { goals: datedGoals, loading: datedGoalsLoading, refresh: refreshDatedGoals } = useGoals(userId);

  useEffect(() => {
    getUserGoals(userId)
      .then(setGoals)
      .catch(() => {}) // non-blocking: the rest of the dashboard still works
      .finally(() => setGoalsLoaded(true));
  }, [userId, refreshTick]);

  const streaks = useMemo(
    () => summariseStreaks(solved.map((s) => s.solvedAt)),
    [solved]
  );
  const recommendations = useMemo(() => recommendNext(targets, 3), [targets]);
  const { focus } = useTopics(userId, refreshTick);

  const pendingCount = targets.filter((t) => t.status === "pending").length;
  // Solved targets archive out of this preview once done — the point of
  // "recent" here is what's still ahead, not a growing list of checkmarks.
  const activeTargets = targets.filter((t) => t.status !== "done");

  // Keep the original LeetCode dashboard exactly as its own progression system.
  // The exam modes intentionally have their own lighter recall workspace.
  if (mode !== "leetcode") return <StudyTrackDashboard mode={mode} />;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`${greeting(new Date())} · LeetCode`}
        title={statusLine({ goals, streaks, pendingCount, solvedTotal: solved.length })}
      />

      {/* Deadlines lead. The daily/weekly cadence below answers "what about
       * today"; this answers "and is today enough", which is the question a
       * fixed date makes possible to ask at all. */}
      {datedGoalsLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <GoalDeck
          goals={datedGoals}
          track="leetcode"
          userId={userId}
          progressFor={() => solved.length}
          onChanged={refreshDatedGoals}
        />
      )}

      {!goalsLoaded ? (
        <Skeleton className="h-28 w-full" />
      ) : goals ? (
        <TodayCard goals={goals} streaks={streaks} />
      ) : (
        <NoGoalsCard>
          <p className="text-sm font-medium text-text">Set a target to practise against.</p>
          <p className="mt-1 text-[13px] text-text-muted">
            Two numbers is all it takes — your dashboard measures every day and week against them.
          </p>
          <div className="mt-4">
            <GoalsForm userId={userId} onSaved={refresh} onboarding />
          </div>
        </NoGoalsCard>
      )}

      {loading ? <Skeleton className="h-40 w-full" /> : <NextTarget recommendations={recommendations} />}

      {/* From here down the page is below the fold on most screens, so each
       * block arrives as the reader reaches it rather than all at once on
       * load. Above the fold keeps the shell's own entrance — revealing
       * content that is already on screen would just make loading look
       * slower. */}
      <Reveal>
        <ProgressSummary targets={targets} solved={solved} />
      </Reveal>

      <Reveal className="stagger grid gap-4 lg:grid-cols-2">
        <DifficultyBreakdown userId={userId} refreshKey={refreshTick} />
        <ActivityStrip solved={solved} />
      </Reveal>

      <Reveal>
        <FocusAreas focus={focus} />
      </Reveal>

      <Reveal>
        <ImportLeetCode userId={userId} onImported={refresh} />
      </Reveal>

      <Reveal as="section" className="flex flex-col gap-3">
        <SectionHeader
          title="Recent targets"
          icon={<ListChecks className="h-4 w-4 text-text-muted" aria-hidden />}
          action={
            <Link to="/practice">
              <Button size="sm" variant="ghost">
                All targets
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </Link>
          }
        />
        {loading ? (
          <SkeletonRows rows={4} />
        ) : targets.length === 0 ? (
          <EmptyState
            title="No targets yet."
            description="Targets are the problems you plan to solve. Add one by hand or upload a CSV to build your list."
            action={
              <Link to="/practice">
                <Button variant="primary" size="sm">
                  Add targets
                </Button>
              </Link>
            }
          />
        ) : activeTargets.length === 0 ? (
          <EmptyState
            title="Everything's solved."
            description="Every current target is done — solved ones archive out of this preview. Add more from the practice page."
            action={
              <Link to="/practice">
                <Button variant="primary" size="sm">
                  Add targets
                </Button>
              </Link>
            }
          />
        ) : (
          <TargetsTable targets={activeTargets.slice(0, 8)} />
        )}
      </Reveal>

      {goals && (
        <Card className="p-4">
          <SectionHeader title="Adjust your targets" description="Change what a good day and week look like." />
          <div className="mt-4">
            <GoalsForm userId={userId} existing={goals} onSaved={refresh} />
          </div>
        </Card>
      )}
    </div>
  );
}

/** One sentence describing where the reader stands right now. Every branch is
 * a statement of fact about their own data — no encouragement they haven't
 * earned, and nothing implied that isn't recorded. */
function statusLine({
  goals,
  streaks,
  pendingCount,
  solvedTotal,
}: {
  goals?: UserGoals;
  streaks: ReturnType<typeof summariseStreaks>;
  pendingCount: number;
  solvedTotal: number;
}): string {
  if (solvedTotal === 0 && pendingCount === 0) return "Let's set up your practice.";
  if (!goals) return `${solvedTotal} problem${solvedTotal === 1 ? "" : "s"} solved so far.`;

  if (streaks.solvedToday >= goals.dailyTarget) {
    return streaks.current > 1
      ? `Today's target is done — ${streaks.current} days running.`
      : "Today's target is done.";
  }
  if (streaks.solvedToday > 0) {
    return `${goals.dailyTarget - streaks.solvedToday} more to hit today's target.`;
  }
  if (streaks.current > 0) {
    return `${streaks.current}-day streak — solve one to keep it alive.`;
  }
  return pendingCount > 0 ? "Nothing solved today yet." : "Nothing solved today yet.";
}
