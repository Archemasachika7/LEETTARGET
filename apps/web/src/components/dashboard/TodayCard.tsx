import { Target as TargetIcon } from "lucide-react";
import type { StreakSummary, UserGoals } from "@leettarget/shared";
import { nextMilestone } from "@leettarget/shared";
import { Card, Chassis, MonoLabel, Panel, SegmentBar, StatusDot, TelemetryBar } from "../../ui/index.js";

/** The primary readout: today's target as the headline, with the week and the
 * streak stacked beside it.
 *
 * Deliberately a 7/5 asymmetric split inside one chassis rather than three
 * equal cards — today's number is what should drive the next hour, and giving
 * all three the same footprint would say they matter equally. The week and
 * streak are context for it, so they get the narrower column and share its
 * dividers. */
export function TodayCard({ goals, streaks }: { goals: UserGoals; streaks: StreakSummary }) {
  const dayDone = streaks.solvedToday >= goals.dailyTarget;
  const weekDone = streaks.solvedThisWeek >= goals.weeklyTarget;
  const remaining = Math.max(0, goals.dailyTarget - streaks.solvedToday);
  const milestone = nextMilestone(streaks.current);

  return (
    <Chassis>
      <TelemetryBar
        left={
          <>
            <span className="flex items-center gap-2">
              <StatusDot tone={dayDone ? "success" : "warning"} />
              <span className="text-text-secondary">Daily target</span>
            </span>
          </>
        }
        right={
          <>
            <span>Week {weekDone ? "met" : "in progress"}</span>
            <span className="text-text-secondary">
              Streak {streaks.current}d
            </span>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* Headline: today. */}
        <div className="md:col-span-7 md:border-r md:border-border">
          <Panel mark className="flex h-full flex-col justify-between gap-8">
            <div>
              <MonoLabel index={1}>Today</MonoLabel>
              <p className="mt-5 font-mono text-5xl font-semibold tracking-tighter text-text">
                {streaks.solvedToday}
                <span className="text-2xl font-normal text-text-muted"> / {goals.dailyTarget}</span>
              </p>
              <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-text-secondary">
                {dayDone
                  ? "Target met for today. Anything further is a bonus."
                  : `${remaining} more problem${remaining === 1 ? "" : "s"} to hit today's target.`}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
                <span>Progress</span>
                <span className="tnum">
                  {goals.dailyTarget > 0
                    ? Math.min(100, Math.round((streaks.solvedToday / goals.dailyTarget) * 100))
                    : 0}
                  %
                </span>
              </div>
              <SegmentBar
                value={streaks.solvedToday}
                max={goals.dailyTarget}
                segments={24}
                tone={dayDone ? "success" : "brand"}
                label={`Today: ${streaks.solvedToday} of ${goals.dailyTarget}`}
              />
            </div>
          </Panel>
        </div>

        {/* Context: week and streak, stacked. */}
        <div className="md:col-span-5">
          <div className="border-t border-border md:border-t-0">
            <Panel interactive>
              <div className="flex items-center justify-between">
                <MonoLabel index={2}>This week</MonoLabel>
                <span className={weekDone ? "font-mono text-[10px] uppercase tracking-wider text-success" : "font-mono text-[10px] uppercase tracking-wider text-text-muted"}>
                  {weekDone ? "Met" : `${goals.weeklyTarget - streaks.solvedThisWeek} left`}
                </span>
              </div>
              <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-text">
                {streaks.solvedThisWeek}
                <span className="text-base font-normal text-text-muted"> / {goals.weeklyTarget}</span>
              </p>
              <SegmentBar
                value={streaks.solvedThisWeek}
                max={goals.weeklyTarget}
                segments={20}
                tone={weekDone ? "success" : "brand"}
                className="mt-3"
                label={`This week: ${streaks.solvedThisWeek} of ${goals.weeklyTarget}`}
              />
            </Panel>
          </div>

          <div className="border-t border-border">
            <Panel interactive>
              <div className="flex items-center justify-between">
                <MonoLabel index={3}>Streak</MonoLabel>
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  Best {streaks.longest}d
                </span>
              </div>
              <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-text">
                {streaks.current}
                <span className="text-base font-normal text-text-muted"> days</span>
              </p>
              <p className="mt-2 text-[12px] text-text-muted">
                {streaks.current === 0
                  ? "Solve one problem to start a streak."
                  : milestone
                    ? `${milestone - streaks.current} day${milestone - streaks.current === 1 ? "" : "s"} to ${milestone}`
                    : `${streaks.activeDays} active days recorded`}
              </p>
            </Panel>
          </div>
        </div>
      </div>

      <TelemetryBar
        position="bottom"
        left={<span>Active days // {streaks.activeDays}</span>}
        right={<span>Local time zone</span>}
      />
    </Chassis>
  );
}

/** Shown in place of TodayCard when no goals row exists yet. Onboarding is
 * one question, inline, rather than a multi-page flow. */
export function NoGoalsCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-brand/30 bg-brand/[0.04] p-5">
      <div className="flex items-start gap-3">
        <TargetIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </Card>
  );
}
