import { Flame, Target as TargetIcon } from "lucide-react";
import type { StreakSummary, UserGoals } from "@leettarget/shared";
import { nextMilestone } from "@leettarget/shared";
import { Card, Eyebrow, ProgressBar, ProgressRing } from "../../ui/index.js";

/** Today's and this week's targets side by side — the two cadences the
 * dashboard measures against. Today gets the ring because it's the number
 * that should drive the next hour; the week gets a bar because it's context. */
export function TodayCard({ goals, streaks }: { goals: UserGoals; streaks: StreakSummary }) {
  const dayDone = streaks.solvedToday >= goals.dailyTarget;
  const weekDone = streaks.solvedThisWeek >= goals.weeklyTarget;
  const milestone = nextMilestone(streaks.current);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="flex items-center gap-4 p-4">
        <ProgressRing
          value={streaks.solvedToday}
          max={goals.dailyTarget}
          label={`Today: ${streaks.solvedToday} of ${goals.dailyTarget}`}
        >
          <span className="font-mono text-lg font-semibold tabular-nums text-text">{streaks.solvedToday}</span>
          <span className="mt-0.5 text-[10px] text-text-muted">of {goals.dailyTarget}</span>
        </ProgressRing>
        <div className="min-w-0">
          <Eyebrow>Today</Eyebrow>
          <p className="mt-1 text-sm font-medium text-text">
            {dayDone ? "Target met" : `${goals.dailyTarget - streaks.solvedToday} to go`}
          </p>
          <p className="mt-0.5 text-[12px] text-text-muted">
            {dayDone ? "Anything more is a bonus." : `Daily target: ${goals.dailyTarget}`}
          </p>
        </div>
      </Card>

      <Card className="flex flex-col justify-between p-4">
        <div>
          <Eyebrow>This week</Eyebrow>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-text">
            {streaks.solvedThisWeek}
            <span className="text-base font-normal text-text-muted"> / {goals.weeklyTarget}</span>
          </p>
        </div>
        <div className="mt-3">
          <ProgressBar
            value={streaks.solvedThisWeek}
            max={goals.weeklyTarget}
            tone={weekDone ? "success" : "brand"}
            label={`This week: ${streaks.solvedThisWeek} of ${goals.weeklyTarget}`}
          />
          <p className="mt-1.5 text-[12px] text-text-muted">
            {weekDone
              ? "Weekly target met."
              : `${goals.weeklyTarget - streaks.solvedThisWeek} more this week`}
          </p>
        </div>
      </Card>

      <Card className="flex flex-col justify-between p-4">
        <div>
          <Eyebrow>Streak</Eyebrow>
          <p className="mt-1 flex items-baseline gap-1.5 font-mono text-2xl font-semibold tabular-nums text-text">
            {streaks.current}
            {streaks.current > 0 && <Flame className="h-4 w-4 text-warning" aria-hidden />}
          </p>
        </div>
        <p className="mt-3 text-[12px] text-text-muted">
          {streaks.current === 0
            ? "Solve one problem to start a streak."
            : milestone
              ? `${milestone - streaks.current} day${milestone - streaks.current === 1 ? "" : "s"} to a ${milestone}-day streak`
              : `Longest: ${streaks.longest} days`}
        </p>
      </Card>
    </div>
  );
}

/** Shown in place of TodayCard when no goals row exists yet. Onboarding is
 * one question, inline, rather than a multi-page flow. */
export function NoGoalsCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-brand/25 bg-brand/[0.04] p-5">
      <div className="flex items-start gap-3">
        <TargetIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </Card>
  );
}
