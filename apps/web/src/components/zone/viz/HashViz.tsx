import { useMemo, useState } from "react";
import { hashSteps, type CollisionStrategy } from "@leettarget/shared";
import { PlayerControls, Stat, parseNumbers, usePlayer } from "./player.js";
import { ZInput, ZLabel, ZSelect } from "../primitives.js";
import { cn } from "../../../lib/cn.js";

export function HashViz() {
  const [strategy, setStrategy] = useState<CollisionStrategy>("linear-probing");
  const [size, setSize] = useState(7);
  const [text, setText] = useState("50, 700, 76, 85, 92, 73, 101");
  const keys = useMemo(() => parseNumbers(text, 14).map(Math.abs), [text]);
  const steps = useMemo(() => hashSteps(keys, size, strategy), [keys, size, strategy]);
  const player = usePlayer(steps.length, `${strategy}|${size}|${keys.join(",")}`);
  const step = steps[player.index];
  const filled = step.table.reduce((n, b) => n + b.length, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <ZLabel>Collisions</ZLabel>
          <ZSelect value={strategy} onChange={(e) => setStrategy(e.target.value as CollisionStrategy)} className="w-44">
            <option value="linear-probing">Linear probing</option>
            <option value="chaining">Separate chaining</option>
          </ZSelect>
        </label>
        <label className="flex flex-col gap-1">
          <ZLabel>Buckets (m)</ZLabel>
          <ZSelect value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-24">
            {[5, 7, 10, 11, 13].map((m) => <option key={m} value={m}>{m}</option>)}
          </ZSelect>
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <ZLabel>Keys to insert, in order</ZLabel>
          <ZInput value={text} onChange={(e) => setText(e.target.value)} />
        </label>
      </div>

      <div className="grid gap-1">
        {step.table.map((bucket, i) => {
          const home = step.home === i;
          const probed = step.probes.includes(i);
          const placed = step.placedAt === i;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className={cn("w-10 text-right font-plex text-[11px] tabular-nums", home ? "text-z-accent" : "text-z-faint")}>
                [{i}]
              </span>
              <div
                className={cn(
                  "flex h-10 min-w-[56px] items-center gap-1 border px-1.5",
                  placed ? "border-z-accent" : probed ? "border-z-accent/50 border-dashed" : "border-z-ink/20"
                )}
              >
                {bucket.length === 0 && <span className="px-1 font-plex text-[11px] text-z-faint">empty</span>}
                {bucket.map((k, j) => (
                  <span key={j} className="flex items-center gap-1">
                    {j > 0 && <span className="font-plex text-[11px] text-z-faint">→</span>}
                    <span
                      className={cn(
                        "flex h-7 min-w-[36px] items-center justify-center px-1.5 font-plex text-[13px] tabular-nums",
                        placed && k === step.key ? "bg-z-accent text-z-bg" : "bg-z-ink/10 text-z-ink"
                      )}
                    >
                      {k}
                    </span>
                  </span>
                ))}
              </div>
              {home && step.key !== undefined && (
                <span className="font-plex text-[11px] text-z-accent">← h({step.key}) = {step.key} mod {size}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-8">
        <Stat label="Collisions so far" value={step.collisions} />
        <Stat label="Load factor n/m" value={(filled / size).toFixed(2)} />
        <p className="max-w-md self-end font-plex text-[12px] leading-5 text-z-muted">
          {strategy === "chaining"
            ? "Chaining never runs out of room; lookups cost 1 + α on average."
            : "Probing keeps one key per slot, so α can't pass 1. Clusters grow as α rises."}
        </p>
      </div>

      <PlayerControls player={player} length={steps.length} note={step.note} />
    </div>
  );
}
