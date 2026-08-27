import type { SolvedProblem, Target } from "@leettarget/shared";
import { AnimatedNumber, Chassis, MonoLabel, Panel, SegmentBar } from "../ui/index.js";

interface Props {
  targets: Target[];
  solved: SolvedProblem[];
}

/** Three counts sharing one enclosure, separated by hairlines rather than
 * gaps — a row of channels on an instrument, not three cards. Each carries
 * its own registration mark and index so the fascia reads left to right. */
export function ProgressSummary({ targets, solved }: Props) {
  const done = targets.filter((t) => t.status === "done").length;
  const pct = targets.length > 0 ? Math.round((done / targets.length) * 100) : 0;

  return (
    <Chassis>
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Panel mark interactive>
          <MonoLabel index={1}>Solved</MonoLabel>
          <p className="mt-4 font-mono text-3xl font-semibold tracking-tight text-text">
            <AnimatedNumber value={solved.length} />
          </p>
          <p className="mt-1 text-[12px] text-text-muted">problems recorded</p>
        </Panel>

        <Panel mark interactive>
          <MonoLabel index={2}>Targets</MonoLabel>
          <p className="mt-4 font-mono text-3xl font-semibold tracking-tight text-text">
            <AnimatedNumber value={targets.length} />
          </p>
          <p className="mt-1 text-[12px] text-text-muted">problems planned</p>
        </Panel>

        <Panel mark interactive>
          <div className="flex items-center justify-between">
            <MonoLabel index={3}>Completed</MonoLabel>
            <span className="font-mono text-[10px] tabular-nums tracking-wider text-text-muted">{pct}%</span>
          </div>
          <p className="mt-4 font-mono text-3xl font-semibold tracking-tight text-text">
            {done}
            <span className="text-base font-normal text-text-muted"> / {targets.length}</span>
          </p>
          <SegmentBar
            value={done}
            max={Math.max(targets.length, 1)}
            segments={18}
            tone={pct === 100 ? "success" : "brand"}
            className="mt-3"
            label="Target completion"
          />
        </Panel>
      </div>
    </Chassis>
  );
}
