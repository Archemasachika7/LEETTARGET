import { Activity } from "lucide-react";
import { dailyActivity } from "@leettarget/shared";
import type { SolvedProblem } from "@leettarget/shared";
import { Card, SectionHeader } from "../../ui/index.js";
import { cn } from "../../lib/cn.js";

/** Fourteen days of solve counts. Intensity is an ordinal quantity, so it
 * uses opacity steps of the single brand hue rather than different colours —
 * more solves reads as "more of the same thing", which is what it is. */
function intensityClass(count: number, busiest: number): string {
  if (count === 0) return "bg-surface";
  const ratio = busiest > 0 ? count / busiest : 0;
  if (ratio > 0.66) return "bg-brand";
  if (ratio > 0.33) return "bg-brand/65";
  return "bg-brand/35";
}

export function ActivityStrip({ solved }: { solved: SolvedProblem[] }) {
  const days = dailyActivity(
    solved.map((s) => s.solvedAt),
    14
  );
  const busiest = Math.max(...days.map((d) => d.count), 0);
  const total = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="p-4">
      <SectionHeader
        title="Last 14 days"
        description={
          total === 0
            ? "No solves recorded in this window."
            : `${total} solve${total === 1 ? "" : "s"}, ${days.filter((d) => d.count > 0).length} active day${
                days.filter((d) => d.count > 0).length === 1 ? "" : "s"
              }`
        }
        icon={<Activity className="h-4 w-4 text-text-muted" aria-hidden />}
      />

      <ol className="mt-4 flex gap-1">
        {days.map((d) => (
          <li
            key={d.key}
            className="flex-1"
            title={`${d.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}: ${
              d.count
            } solved`}
          >
            <div className={cn("h-8 rounded-sm transition-colors duration-normal", intensityClass(d.count, busiest))} />
            <div className="mt-1 text-center text-[10px] text-text-muted">
              {d.date.toLocaleDateString(undefined, { weekday: "narrow" })}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
