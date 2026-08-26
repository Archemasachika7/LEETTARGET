import type { SolvedProblem, Target } from "@leettarget/shared";

interface Props {
  targets: Target[];
  solved: SolvedProblem[];
}

export function ProgressSummary({ targets, solved }: Props) {
  const done = targets.filter((t) => t.status === "done").length;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label="Solved" value={solved.length} />
      <Stat label="Targets" value={targets.length} />
      <Stat label="Targets done" value={`${done}/${targets.length}`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-center transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800">
      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
