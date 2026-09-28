import { useState } from "react";
import { ZButton, ZInput, ZLabel } from "../primitives.js";
import { cn } from "../../../lib/cn.js";

type Kind = "stack" | "queue" | "list";

interface LogLine {
  text: string;
  cost: string;
}

const START: Record<Kind, number[]> = { stack: [4, 9, 2], queue: [7, 1, 5], list: [3, 8, 6] };

export function LinearViz() {
  const [kind, setKind] = useState<Kind>("stack");
  const [items, setItems] = useState<number[]>(START.stack);
  const [value, setValue] = useState("12");
  const [log, setLog] = useState<LogLine[]>([]);
  const [flash, setFlash] = useState<number | undefined>();

  const v = Number.parseInt(value, 10);
  const valid = Number.isFinite(v);
  const record = (line: LogLine) => setLog((l) => [line, ...l].slice(0, 6));

  const switchKind = (k: Kind) => {
    setKind(k);
    setItems(START[k]);
    setLog([]);
    setFlash(undefined);
  };

  // Stacks grow at the right end (the top); queues leave from the left (the front).
  const push = () => { if (!valid) return; setItems((a) => [...a, v]); setFlash(items.length); record({ text: `push(${v})`, cost: "O(1)" }); };
  const pop = () => {
    if (!items.length) return record({ text: "pop() on an empty stack: underflow", cost: "—" });
    record({ text: `pop() → ${items[items.length - 1]}`, cost: "O(1)" });
    setItems((a) => a.slice(0, -1));
    setFlash(undefined);
  };
  const enqueue = () => { if (!valid) return; setItems((a) => [...a, v]); setFlash(items.length); record({ text: `enqueue(${v}) at the rear`, cost: "O(1)" }); };
  const dequeue = () => {
    if (!items.length) return record({ text: "dequeue() on an empty queue: underflow", cost: "—" });
    record({ text: `dequeue() → ${items[0]} from the front`, cost: "O(1)" });
    setItems((a) => a.slice(1));
    setFlash(undefined);
  };
  const insertHead = () => { if (!valid) return; setItems((a) => [v, ...a]); setFlash(0); record({ text: `insert ${v} at head`, cost: "O(1)" }); };
  const insertTail = () => {
    if (!valid) return;
    setItems((a) => [...a, v]);
    setFlash(items.length);
    record({ text: `insert ${v} at tail: walked ${items.length} node${items.length === 1 ? "" : "s"} (no tail pointer)`, cost: "O(n)" });
  };
  const remove = () => {
    if (!valid) return;
    const at = items.indexOf(v);
    if (at === -1) return record({ text: `delete ${v}: not found after ${items.length} nodes`, cost: "O(n)" });
    record({ text: `delete ${v}: found at position ${at}, relinked its neighbours`, cost: "O(n)" });
    setItems((a) => a.filter((_, i) => i !== at));
    setFlash(undefined);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap border border-z-ink/25" role="radiogroup" aria-label="Structure">
          {(["stack", "queue", "list"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => switchKind(k)}
              className={cn(
                "h-9 px-3 font-plex text-[11px] uppercase tracking-[0.1em] transition-colors",
                kind === k ? "bg-z-ink text-z-bg" : "text-z-muted hover:text-z-ink"
              )}
            >
              {k === "list" ? "Linked list" : k}
            </button>
          ))}
        </div>
        <label className="flex w-24 flex-col gap-1">
          <ZLabel>Value</ZLabel>
          <ZInput value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" />
        </label>
        {kind === "stack" && (<><ZButton onClick={push} disabled={!valid}>Push</ZButton><ZButton onClick={pop}>Pop</ZButton></>)}
        {kind === "queue" && (<><ZButton onClick={enqueue} disabled={!valid}>Enqueue</ZButton><ZButton onClick={dequeue}>Dequeue</ZButton></>)}
        {kind === "list" && (
          <>
            <ZButton onClick={insertHead} disabled={!valid}>Insert head</ZButton>
            <ZButton onClick={insertTail} disabled={!valid}>Insert tail</ZButton>
            <ZButton onClick={remove} disabled={!valid}>Delete value</ZButton>
          </>
        )}
      </div>

      <div className="flex min-h-[112px] items-center overflow-x-auto py-4">
        {items.length === 0 && <p className="font-plex text-sm text-z-muted">Empty.</p>}
        <div className="flex items-center gap-0">
          {kind === "list" && items.length > 0 && <span className="mr-2 font-plex text-[10px] uppercase tracking-wider text-z-accent">head →</span>}
          {items.map((x, i) => {
            const end =
              kind === "stack" ? (i === items.length - 1 ? "top" : "") :
              kind === "queue" ? (i === 0 && i === items.length - 1 ? "front·rear" : i === 0 ? "front" : i === items.length - 1 ? "rear" : "") : "";
            return (
              <div key={`${i}-${x}`} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="h-4 font-plex text-[9px] uppercase tracking-wider text-z-accent">{end}</span>
                  <div
                    className={cn(
                      "flex h-12 items-stretch border font-plex text-sm tabular-nums",
                      flash === i ? "border-z-accent bg-z-accent/10" : "border-z-ink/35"
                    )}
                  >
                    <span className="flex w-12 items-center justify-center text-z-ink">{x}</span>
                    {kind === "list" && <span className="w-4 border-l border-z-ink/25 bg-z-ink/5" title="next pointer" />}
                  </div>
                </div>
                {kind === "list" ? (
                  <span className="mx-1 mt-5 font-plex text-z-muted">{i === items.length - 1 ? "→ null" : "→"}</span>
                ) : (
                  <span className="w-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <ZLabel>Operations</ZLabel>
        <ul className="mt-2 flex flex-col gap-1 font-plex text-[12px]">
          {log.length === 0 && <li className="text-z-faint">Nothing yet. Try the buttons above.</li>}
          {log.map((line, i) => (
            <li key={log.length - i} className={cn("flex justify-between gap-4 border-b border-z-ink/10 pb-1", i === 0 ? "text-z-ink" : "text-z-muted")}>
              <span>{line.text}</span>
              <span className="text-z-accent">{line.cost}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
