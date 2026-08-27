import { dailyActivity } from "@leettarget/shared";
import type { SolvedProblem } from "@leettarget/shared";
import { Chassis, MonoLabel, Panel, TelemetryBar } from "../../ui/index.js";
import { cn } from "../../lib/cn.js";

/** Fourteen days of solve counts as a submission matrix.
 *
 * Intensity is an ordinal quantity — more solves is more of the same thing —
 * so it steps through opacities of one hue rather than changing colour. Cells
 * are square-cornered and butt-jointed: a readout grid, not a row of pills. */
function intensityClass(count: number, busiest: number): string {
  if (count === 0) return "bg-border/50";
  const ratio = busiest > 0 ? count / busiest : 0;
  if (ratio > 0.66) return "bg-brand";
  if (ratio > 0.33) return "bg-brand/60";
  return "bg-brand/30";
}

export function ActivityStrip({ solved }: { solved: SolvedProblem[] }) {
  const days = dailyActivity(
    solved.map((s) => s.solvedAt),
    14
  );
  const busiest = Math.max(...days.map((d) => d.count), 0);
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  return (
    <Chassis className="flex h-full flex-col">
      <TelemetryBar
        left={<span className="text-text-secondary">Submission matrix</span>}
        right={<span className="tnum">14d window</span>}
      />

      <Panel mark className="flex-1">
        <div className="flex items-baseline justify-between">
          <MonoLabel index={1}>Recent activity</MonoLabel>
          <span className="font-mono text-sm font-semibold tabular-nums text-text">{total}</span>
        </div>

        <ol className="mt-5 flex gap-1">
          {days.map((d) => (
            <li
              key={d.key}
              className="flex-1"
              title={`${d.date.toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}: ${d.count} solved`}
            >
              <div className={cn("h-9 transition-colors duration-normal", intensityClass(d.count, busiest))} />
              <div className="mt-1.5 text-center font-mono text-[9px] uppercase text-text-muted">
                {d.date.toLocaleDateString(undefined, { weekday: "narrow" })}
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
          {total === 0
            ? "No solves in this window"
            : `${activeDays} active day${activeDays === 1 ? "" : "s"} // peak ${busiest}`}
        </p>
      </Panel>
    </Chassis>
  );
}
