import { useMemo, useState } from "react";
import { bstInsertSteps, bstLayout, bstTraversal, type BstNode, type TreeOrder } from "@leettarget/shared";
import { PlayerControls, parseNumbers, randomNumbers, usePlayer } from "./player.js";
import { ZButton, ZInput, ZLabel } from "../primitives.js";
import { cn } from "../../../lib/cn.js";

type Mode = "build" | TreeOrder;

const MODES: { id: Mode; label: string }[] = [
  { id: "build", label: "Insert" },
  { id: "inorder", label: "Inorder" },
  { id: "preorder", label: "Preorder" },
  { id: "postorder", label: "Postorder" },
  { id: "level", label: "Level order" },
];

const ORDER_RULE: Record<TreeOrder, string> = {
  inorder: "left, node, right. On a BST this comes out sorted.",
  preorder: "node, left, right. The order you'd copy the tree in.",
  postorder: "left, right, node. The order you'd delete it in.",
  level: "row by row from the root, using a queue.",
};

export function BstViz() {
  const [text, setText] = useState("50, 30, 70, 20, 40, 60, 80, 35, 65");
  const [mode, setMode] = useState<Mode>("build");
  const keys = useMemo(() => parseNumbers(text, 15), [text]);
  const build = useMemo(() => bstInsertSteps(keys), [keys]);
  const finalNodes = build[build.length - 1].nodes;
  const order = useMemo(() => (mode === "build" ? [] : bstTraversal(finalNodes, mode)), [mode, finalNodes]);
  const length = mode === "build" ? build.length : order.length + 1;
  const player = usePlayer(length, `${mode}|${keys.join(",")}`);

  let nodes: BstNode[];
  let highlight: number[] = [];
  let current: number | undefined;
  let visited: number[] = [];
  let note: string;
  if (mode === "build") {
    const step = build[player.index];
    nodes = step.nodes;
    highlight = step.path;
    current = step.inserted;
    note = step.note;
  } else {
    nodes = finalNodes;
    visited = order.slice(0, player.index);
    current = visited[visited.length - 1];
    note =
      player.index === 0
        ? `${MODES.find((m) => m.id === mode)!.label}: ${ORDER_RULE[mode]}`
        : `Visit ${nodes[current!].key}. So far: ${visited.map((i) => nodes[i].key).join(", ")}`;
  }

  const layout = bstLayout(nodes);
  const depth = Math.max(0, ...layout.map((p) => p.depth));
  const colW = 52;
  const rowH = 62;
  const width = Math.max(1, nodes.length) * colW;
  const height = (depth + 1) * rowH;
  const cx = (i: number) => layout[i].x * colW + colW / 2;
  const cy = (i: number) => layout[i].depth * rowH + 24;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap border border-z-ink/25" role="radiogroup" aria-label="Mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "h-9 px-3 font-plex text-[11px] uppercase tracking-[0.1em] transition-colors",
                mode === m.id ? "bg-z-ink text-z-bg" : "text-z-muted hover:text-z-ink"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <ZLabel>Keys, inserted in this order</ZLabel>
          <ZInput value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <ZButton onClick={() => setText(randomNumbers(9).join(", "))}>Random</ZButton>
        <ZButton onClick={() => setText([10, 20, 30, 40, 50, 60].join(", "))}>Sorted input</ZButton>
      </div>

      <div className="overflow-x-auto">
        {nodes.length === 0 ? (
          <p className="py-10 text-center font-plex text-sm text-z-muted">The tree is empty. Step forward to insert the first key.</p>
        ) : (
          <svg width={width} height={height} className="mx-auto block" role="img" aria-label="Binary search tree">
            {nodes.map((n, i) =>
              (["left", "right"] as const).map((side) => {
                const c = n[side];
                if (c === null) return null;
                const onPath = highlight.includes(i) && (highlight.includes(c) || current === c);
                return (
                  <line
                    key={`${i}-${side}`}
                    x1={cx(i)} y1={cy(i)} x2={cx(c)} y2={cy(c)}
                    className={onPath ? "stroke-z-accent" : "stroke-z-ink/30"}
                    strokeWidth={onPath ? 1.75 : 1}
                  />
                );
              })
            )}
            {nodes.map((n, i) => {
              const isCurrent = current === i;
              const done = visited.includes(i);
              const onPath = highlight.includes(i);
              return (
                <g key={i}>
                  <rect
                    x={cx(i) - 17} y={cy(i) - 14} width={34} height={28}
                    className={cn(
                      isCurrent ? "fill-z-accent stroke-z-accent" : done ? "fill-z-ink stroke-z-ink" : "fill-z-raised",
                      !isCurrent && !done && (onPath ? "stroke-z-accent" : "stroke-z-ink/40")
                    )}
                  />
                  <text
                    x={cx(i)} y={cy(i) + 4.5} textAnchor="middle"
                    className={cn("font-plex text-[12px] tabular-nums", isCurrent || done ? "fill-z-bg" : "fill-z-ink")}
                  >
                    {n.key}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {mode !== "build" && (
        <p className="font-plex text-[13px] tabular-nums text-z-muted">
          Output: <span className="text-z-ink">{visited.map((i) => nodes[i].key).join("  ") || "—"}</span>
        </p>
      )}
      {mode === "build" && player.index === build.length - 1 && nodes.length > 1 && (
        <p className="font-plex text-[12px] text-z-muted">
          Height {depth}. {depth === nodes.length - 1 ? "Every node has one child: this tree is a list, and search costs O(n)." : `A balanced tree with ${nodes.length} nodes needs height ${Math.ceil(Math.log2(nodes.length + 1)) - 1}.`}
        </p>
      )}

      <PlayerControls player={player} length={length} note={note} />
    </div>
  );
}
