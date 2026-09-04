import { useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import type { Goal, GoalPace, GoalTrack } from "@leettarget/shared";
import { describeGoal, formatCountdown, sortGoalsByUrgency, summariseGoal } from "@leettarget/shared";
import { Badge, Button, Chassis, MonoLabel, Panel, SegmentBar, StatusDot, TelemetryBar } from "../../ui/index.js";
import { cn } from "../../lib/cn.js";
import { GoalForm } from "./GoalForm.js";

/** Colour only ever encodes a fact here (see index.css): pace is a fact about
 * recorded progress against elapsed time, so it earns a tone. "Untracked" —
 * a date with no count — stays neutral rather than being coloured green, since
 * nothing about it has been measured. */
const PACE_TONE: Record<GoalPace, "success" | "warning" | "danger" | "muted"> = {
  ahead: "success",
  "on-track": "success",
  behind: "warning",
  overdue: "danger",
  done: "success",
  untracked: "muted",
};

const PACE_LABEL: Record<GoalPace, string> = {
  ahead: "Ahead",
  "on-track": "On track",
  behind: "Behind",
  overdue: "Overdue",
  done: "Done",
  untracked: "Scheduled",
};

interface Props {
  goals: Goal[];
  track: GoalTrack;
  userId: string;
  /** Progress for a goal, in that goal's own units — solves for LeetCode,
   * cleared items for the exam tracks. The caller owns what counts, because
   * only it knows what the track measures. */
  progressFor: (goal: Goal) => number;
  onChanged: () => void;
}

/** The deck of dated commitments for one track, leading with whichever is
 * nearest.
 *
 * This is the piece that turns a pile of activity into a plan: a countdown on
 * its own only creates pressure, so every goal with a count also carries the
 * rate it now implies and whether the calendar has run ahead of the work. */
export function GoalDeck({ goals, track, userId, progressFor, onChanged }: Props) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Goal>();

  const trackGoals = sortGoalsByUrgency(goals.filter((g) => g.track === track));

  if (adding || editing) {
    return (
      <GoalForm
        userId={userId}
        track={track}
        existing={editing}
        onDone={() => {
          setAdding(false);
          setEditing(undefined);
          onChanged();
        }}
        onCancel={() => {
          setAdding(false);
          setEditing(undefined);
        }}
      />
    );
  }

  if (trackGoals.length === 0) {
    return (
      <Chassis className="edge-lit">
        <TelemetryBar left={<span>Goals</span>} right={<span>Nothing scheduled</span>} />
        <Panel mark className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-lg">
            <h2 className="text-headline font-semibold text-text">Put a date on it.</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              An exam date, a placement deadline, a number to reach before then. Everything else on this page
              becomes a lot more useful once there's something to measure it against.
            </p>
          </div>
          <Button variant="primary" onClick={() => setAdding(true)} className="shrink-0 active:scale-[0.985]">
            <Plus className="h-4 w-4" aria-hidden />
            Add a goal
          </Button>
        </Panel>
      </Chassis>
    );
  }

  const [lead, ...rest] = trackGoals;
  const leadSummary = summariseGoal(lead, progressFor(lead));

  return (
    <Chassis className="edge-lit overflow-hidden">
      <TelemetryBar
        left={
          <span className="flex items-center gap-2">
            <StatusDot tone={PACE_TONE[leadSummary.pace]} />
            <span className="text-text-secondary">Next deadline</span>
          </span>
        }
        right={
          <>
            <span>
              {trackGoals.length} goal{trackGoals.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 text-text-muted transition-colors duration-fast hover:text-text"
            >
              <Plus className="h-3 w-3" aria-hidden />
              Add
            </button>
          </>
        }
      />

      {/* The nearest deadline gets the display figure. Giving every goal the
       * same footprint would say they're equally urgent, which is exactly what
       * a deadline is meant to disambiguate. */}
      <Panel mark className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <MonoLabel index={1}>{lead.title}</MonoLabel>
          <div className="mt-4 flex items-baseline gap-3">
            <span
              className={cn(
                "font-mono text-display font-semibold tnum",
                leadSummary.pace === "overdue" ? "text-danger" : "text-text"
              )}
            >
              {Math.abs(leadSummary.daysLeft)}
            </span>
            <span className="text-title text-text-muted">
              {leadSummary.daysLeft < 0 ? "days past" : leadSummary.daysLeft === 1 ? "day left" : "days left"}
            </span>
          </div>
          <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
            {describeGoal(lead, leadSummary)}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Badge tone={leadSummary.pace === "behind" ? "warning" : leadSummary.pace === "overdue" ? "danger" : leadSummary.pace === "untracked" ? "neutral" : "success"}>
              {PACE_LABEL[leadSummary.pace]}
            </Badge>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
              {new Date(lead.targetDate + "T00:00:00").toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            {/* Divider, so the date and the action don't read as one string. */}
            <span aria-hidden className="h-3 w-px bg-border-strong" />
            <button
              onClick={() => setEditing(lead)}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted underline-offset-4 transition-colors duration-fast hover:text-text hover:underline"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Quantity, when there is one to show. */}
        {leadSummary.percent !== undefined && (
          <div className="w-full shrink-0 border-t border-border pt-5 lg:w-72 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
              <span>Progress</span>
              <span className="tnum">{leadSummary.percent}%</span>
            </div>
            <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-text tnum">
              {leadSummary.completed}
              <span className="text-base font-normal text-text-muted">
                {" "}/ {lead.targetCount} {lead.unit ?? ""}
              </span>
            </p>
            <SegmentBar
              value={leadSummary.completed}
              max={lead.targetCount ?? 1}
              segments={24}
              tone={leadSummary.pace === "behind" ? "warning" : leadSummary.pace === "overdue" ? "danger" : "brand"}
              className="mt-3"
              label={`${lead.title}: ${leadSummary.completed} of ${lead.targetCount}`}
            />
            {leadSummary.expectedByNow !== undefined && (
              <p className="mt-3 text-[12px] leading-5 text-text-muted">
                An even pace would be at{" "}
                <span className="tnum text-text-secondary">{leadSummary.expectedByNow}</span> by today.
              </p>
            )}
          </div>
        )}
      </Panel>

      {/* Everything further out, compressed to one line each. */}
      {rest.length > 0 && (
        <div className="stagger border-t border-border">
          {rest.map((goal) => {
            const s = summariseGoal(goal, progressFor(goal));
            return (
              <button
                key={goal.id}
                onClick={() => setEditing(goal)}
                className="flex w-full items-center gap-3 border-b border-border px-5 py-3 text-left transition-colors duration-fast last:border-b-0 hover:bg-elevated"
              >
                <StatusDot tone={PACE_TONE[s.pace]} />
                <span className="min-w-0 flex-1 truncate text-sm text-text">{goal.title}</span>
                {s.percent !== undefined && (
                  <span className="hidden font-mono text-[11px] text-text-muted tnum sm:inline">{s.percent}%</span>
                )}
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted tnum">
                  {formatCountdown(s.daysLeft)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <TelemetryBar
        position="bottom"
        left={
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-3 w-3" aria-hidden />
            Measured against elapsed time, not a flat quota
          </span>
        }
        right={<span>Local time zone</span>}
      />
    </Chassis>
  );
}
