import type { SolvedProblem, Target } from "@leettarget/shared";
import { Card, ProgressBar, Stat } from "../ui/index.js";

interface Props {
  targets: Target[];
  solved: SolvedProblem[];
}

/** The three headline counts. Deliberately not equal in weight: "solved" is
 * the number that measures actual work done, so it leads; target completion
 * carries a bar because it's the one with a denominator worth seeing. */
export function ProgressSummary({ targets, solved }: Props) {
  const done = targets.filter((t) => t.status === "done").length;
  const pct = targets.length > 0 ? Math.round((done / targets.length) * 100) : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="p-4">
        <Stat label="Solved" value={solved.length} sub="problems recorded" animate />
      </Card>
      <Card className="p-4">
        <Stat label="Targets" value={targets.length} sub="problems planned" animate />
      </Card>
      <Card className="p-4">
        <Stat label="Targets done" value={`${done}/${targets.length}`} sub={`${pct}% complete`} />
        <ProgressBar
          value={done}
          max={targets.length}
          className="mt-3"
          tone={pct === 100 ? "success" : "brand"}
          label="Target completion"
        />
      </Card>
    </div>
  );
}
