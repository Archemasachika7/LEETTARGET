import { useMemo, useState } from "react";
import { binarySearchSteps, linearSearchSteps } from "@leettarget/shared";
import { PlayerControls, Stat, parseNumbers, usePlayer } from "./player.js";
import { ZInput, ZLabel } from "../primitives.js";
import { cn } from "../../../lib/cn.js";

type Mode = "linear" | "binary";

export function SearchViz() {
  const [mode, setMode] = useState<Mode>("binary");
  const [text, setText] = useState("3, 8, 14, 21, 27, 35, 42, 56, 61, 73, 88, 95");
  const [target, setTarget] = useState("61");
  const raw = useMemo(() => parseNumbers(text), [text]);
  // Binary search is only correct on sorted input, so sort rather than let it
  // silently fail. The note under the array says so.
  const values = useMemo(() => (mode === "binary" ? [...raw].sort((a, b) => a - b) : raw), [raw, mode]);
  const goal = Number(target);
  const steps = useMemo(
    () => (mode === "binary" ? binarySearchSteps(values, goal) : linearSearchSteps(values, goal)),
    [mode, values, goal]
  );
  const player = usePlayer(steps.length, `${mode}|${values.join(",")}|${goal}`);
  const step = steps[player.index];
  const wasSorted = raw.every((v, i) => i === 0 || raw[i - 1] <= v);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap border border-z-ink/25" role="radiogroup" aria-label="Search">
          {(["linear", "binary"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "h-9 px-3 font-plex text-[11px] uppercase tracking-[0.1em] transition-colors",
                mode === m ? "bg-z-ink text-z-bg" : "text-z-muted hover:text-z-ink"
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <ZLabel>Array</ZLabel>
          <ZInput value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <ZLabel>Find</ZLabel>
          <ZInput value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" />
        </label>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-1.5 pt-6">
          {values.map((v, i) => {
            const ruledOut = step.ruledOut.includes(i);
            const probing = step.probe === i;
            const found = step.found === i;
            return (
              <div key={i} className="relative flex w-12 flex-col items-center gap-1">
                <span className="absolute -top-5 font-plex text-[9px] uppercase tracking-wider text-z-accent">
                  {mode === "binary" && step.lo === i && step.hi === i ? "lo·hi" : mode === "binary" && step.lo === i ? "lo" : mode === "binary" && step.hi === i ? "hi" : ""}
                </span>
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center border font-plex text-sm tabular-nums transition-colors",
                    found ? "border-z-accent bg-z-accent text-z-bg" : probing ? "border-z-accent text-z-accent" : "border-z-ink/30 text-z-ink",
                    ruledOut && !probing && "border-z-ink/10 text-z-faint line-through"
                  )}
                >
                  {v}
                </div>
                <span className="font-plex text-[10px] text-z-faint">{i}</span>
              </div>
            );
          })}
        </div>
      </div>

      {mode === "binary" && !wasSorted && (
        <p className="font-plex text-[12px] text-z-muted">Your array wasn't sorted, so it's shown sorted: binary search needs that.</p>
      )}

      <div className="flex flex-wrap gap-8">
        <Stat label="Probes" value={step.probes} />
        <Stat label="n" value={values.length} />
        <Stat label={mode === "binary" ? "Worst case, ⌊log₂ n⌋ + 1" : "Worst case, n"} value={mode === "binary" ? Math.floor(Math.log2(Math.max(1, values.length))) + 1 : values.length} />
      </div>

      <PlayerControls player={player} length={steps.length} note={step.note} />
    </div>
  );
}
