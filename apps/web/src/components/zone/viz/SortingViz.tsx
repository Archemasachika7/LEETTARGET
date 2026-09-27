import { useMemo, useState } from "react";
import { sortSteps, type SortAlgorithm } from "@leettarget/shared";
import { PlayerControls, Stat, parseNumbers, randomNumbers, usePlayer } from "./player.js";
import { ZButton, ZInput, ZLabel } from "../primitives.js";
import { cn } from "../../../lib/cn.js";

const ALGORITHMS: { id: SortAlgorithm; name: string; cost: string }[] = [
  { id: "selection", name: "Selection", cost: "Θ(n²) comparisons, always. At most n−1 swaps." },
  { id: "bubble", name: "Bubble", cost: "O(n²). Stops early when a pass makes no swap, so sorted input costs n−1." },
  { id: "insertion", name: "Insertion", cost: "O(n²) worst, n−1 comparisons on sorted input. Stable." },
  { id: "merge", name: "Merge", cost: "Θ(n log n) always, with Θ(n) extra space. Stable." },
  { id: "quick", name: "Quick", cost: "O(n log n) on average, O(n²) when the pivot keeps landing at an end. Here: last element as pivot." },
];

export function SortingViz() {
  const [algorithm, setAlgorithm] = useState<SortAlgorithm>("quick");
  const [text, setText] = useState("38, 27, 43, 3, 9, 82, 10, 51");
  const values = useMemo(() => parseNumbers(text), [text]);
  const steps = useMemo(() => sortSteps(algorithm, values), [algorithm, values]);
  const player = usePlayer(steps.length, `${algorithm}|${values.join(",")}`);
  const step = steps[player.index];
  const max = Math.max(1, ...values.map(Math.abs));
  const info = ALGORITHMS.find((a) => a.id === algorithm)!;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap border border-z-ink/25" role="radiogroup" aria-label="Algorithm">
          {ALGORITHMS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={algorithm === a.id}
              onClick={() => setAlgorithm(a.id)}
              className={cn(
                "h-9 px-3 font-plex text-[11px] uppercase tracking-[0.1em] transition-colors",
                algorithm === a.id ? "bg-z-ink text-z-bg" : "text-z-muted hover:text-z-ink"
              )}
            >
              {a.name}
            </button>
          ))}
        </div>
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <ZLabel>Values, comma separated (up to 16)</ZLabel>
          <ZInput value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <ZButton onClick={() => setText(randomNumbers(10).join(", "))}>Shuffle</ZButton>
        <ZButton onClick={() => setText([...values].sort((a, b) => a - b).join(", "))}>Already sorted</ZButton>
        <ZButton onClick={() => setText([...values].sort((a, b) => b - a).join(", "))}>Reversed</ZButton>
      </div>

      <div className="relative flex h-56 items-end gap-1.5 border-b border-z-ink/40 px-1 sm:gap-2" aria-hidden>
        {step.array.map((v, i) => {
          const comparing = step.compare?.includes(i);
          const swapped = step.swap?.includes(i) || step.write === i;
          const settled = step.sorted.includes(i);
          const outside = step.range && (i < step.range[0] || i > step.range[1]);
          return (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              {step.pivot === i && <span className="font-plex text-[9px] uppercase tracking-wider text-z-accent">pivot</span>}
              <div
                className={cn(
                  "w-full transition-[height,background-color] duration-200",
                  swapped ? "bg-z-accent" : comparing ? "bg-z-accent/45" : settled ? "bg-z-ink" : "bg-z-ink/25",
                  outside && !settled && "opacity-35",
                  comparing && "outline outline-1 outline-z-accent"
                )}
                style={{ height: `${Math.max(4, (Math.abs(v) / max) * 100)}%` }}
              />
              <span className={cn("font-plex text-[11px] tabular-nums", settled ? "text-z-ink" : "text-z-muted")}>{v}</span>
            </div>
          );
        })}
        {values.length === 0 && <p className="m-auto font-plex text-sm text-z-muted">Type some numbers above.</p>}
      </div>

      <div className="flex flex-wrap gap-8">
        <Stat label="Comparisons" value={step.comparisons} />
        <Stat label="Moves" value={step.moves} />
        <Stat label="n" value={values.length} />
        <p className="max-w-md self-end font-plex text-[12px] leading-5 text-z-muted">{info.cost}</p>
      </div>

      <PlayerControls player={player} length={steps.length} note={step.note} />
    </div>
  );
}
