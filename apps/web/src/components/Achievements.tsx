import { Check, Lock, Trophy } from "lucide-react";
import type { Achievement } from "@leettarget/shared";
import { Card, ProgressBar, SectionHeader } from "../ui/index.js";
import { cn } from "../lib/cn.js";

/** Earned achievements read in full colour; unearned ones stay muted and show
 * how far off they are. Locked entries are shown rather than hidden — knowing
 * what's ahead is the motivating part, and a grid that fills in over months
 * says more than a surprise. */
export function Achievements({ list }: { list: Achievement[] }) {
  const earned = list.filter((a) => a.earned).length;

  return (
    <Card className="p-4">
      <SectionHeader
        title="Achievements"
        description={`${earned} of ${list.length} earned`}
        icon={<Trophy className="h-4 w-4 text-text-muted" aria-hidden />}
      />

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {list.map((a) => (
          <li
            key={a.id}
            className={cn(
              "rounded border p-3 transition-colors duration-normal",
              a.earned ? "border-success/25 bg-success/[0.05]" : "border-border bg-surface/50"
            )}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  a.earned ? "bg-success/15 text-success" : "bg-border/60 text-text-muted"
                )}
                aria-hidden
              >
                {a.earned ? <Check className="h-3 w-3" strokeWidth={3} /> : <Lock className="h-2.5 w-2.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[13px] font-medium", a.earned ? "text-text" : "text-text-secondary")}>
                  {a.name}
                </p>
                <p className="mt-0.5 text-[12px] text-text-muted">{a.description}</p>

                {!a.earned && a.progress && a.progress.goal > 1 && (
                  <div className="mt-2">
                    <ProgressBar
                      value={a.progress.current}
                      max={a.progress.goal}
                      label={`${a.name}: ${a.progress.current} of ${a.progress.goal}`}
                    />
                    <p className="mt-1 font-mono text-[11px] tabular-nums text-text-muted">
                      {a.progress.current} / {a.progress.goal}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
