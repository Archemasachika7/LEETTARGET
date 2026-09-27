import { useMemo, useState } from "react";
import { SAMPLE_GRAPH, bfsSteps, dfsSteps, dijkstraSteps, pathTo, type DijkstraStep, type TraversalStep } from "@leettarget/shared";
import { PlayerControls, usePlayer } from "./player.js";
import { ZLabel, ZSelect } from "../primitives.js";
import { cn } from "../../../lib/cn.js";

type Algo = "bfs" | "dfs" | "dijkstra";

const POS: Record<string, [number, number]> = {
  A: [60, 150], B: [200, 60], C: [200, 240], D: [360, 90], E: [360, 250], F: [520, 60], G: [520, 220],
};

const ALGOS: { id: Algo; label: string; blurb: string }[] = [
  { id: "bfs", label: "BFS", blurb: "Queue. Visits by distance in edges, so it finds fewest-hop paths. O(V + E)." },
  { id: "dfs", label: "DFS", blurb: "Stack (or recursion). Goes as deep as it can, then backtracks. O(V + E)." },
  { id: "dijkstra", label: "Dijkstra", blurb: "Always settles the closest unsettled node. Needs non-negative weights. O((V + E) log V) with a heap." },
];

const edgeKey = (u: string, v: string) => [u, v].sort().join("");

export function GraphViz() {
  const [algo, setAlgo] = useState<Algo>("dijkstra");
  const [start, setStart] = useState("A");
  const [target, setTarget] = useState("G");
  const steps = useMemo<(TraversalStep | DijkstraStep)[]>(
    () => (algo === "bfs" ? bfsSteps(SAMPLE_GRAPH, start) : algo === "dfs" ? dfsSteps(SAMPLE_GRAPH, start) : dijkstraSteps(SAMPLE_GRAPH, start)),
    [algo, start]
  );
  const player = usePlayer(steps.length, `${algo}|${start}`);
  const step = steps[player.index];
  const isDijkstra = algo === "dijkstra";
  const dStep = step as DijkstraStep;
  const tStep = step as TraversalStep;
  const atEnd = player.index === steps.length - 1;

  const highlighted = new Set<string>();
  if (isDijkstra) {
    for (const [v, u] of Object.entries(dStep.prev)) if (u && dStep.settled.includes(v)) highlighted.add(edgeKey(u, v));
    if (atEnd) {
      const path = pathTo(dStep.prev, target);
      highlighted.clear();
      for (let i = 1; i < path.length; i++) highlighted.add(edgeKey(path[i - 1], path[i]));
    }
  } else {
    for (const [u, v] of tStep.treeEdges) highlighted.add(edgeKey(u, v));
  }
  const relaxing = isDijkstra && dStep.relaxing ? edgeKey(dStep.relaxing.u, dStep.relaxing.v) : undefined;
  const done = new Set(isDijkstra ? dStep.settled : tStep.order);
  const frontier = new Set(isDijkstra ? [] : tStep.frontier);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap border border-z-ink/25" role="radiogroup" aria-label="Algorithm">
          {ALGOS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={algo === a.id}
              onClick={() => setAlgo(a.id)}
              className={cn(
                "h-9 px-3 font-plex text-[11px] uppercase tracking-[0.1em] transition-colors",
                algo === a.id ? "bg-z-ink text-z-bg" : "text-z-muted hover:text-z-ink"
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1">
          <ZLabel>Start</ZLabel>
          <ZSelect value={start} onChange={(e) => setStart(e.target.value)} className="w-20">
            {SAMPLE_GRAPH.nodes.map((n) => <option key={n}>{n}</option>)}
          </ZSelect>
        </label>
        {isDijkstra && (
          <label className="flex flex-col gap-1">
            <ZLabel>Path to</ZLabel>
            <ZSelect value={target} onChange={(e) => setTarget(e.target.value)} className="w-20">
              {SAMPLE_GRAPH.nodes.map((n) => <option key={n}>{n}</option>)}
            </ZSelect>
          </label>
        )}
        <p className="max-w-md flex-1 font-plex text-[12px] leading-5 text-z-muted">{ALGOS.find((a) => a.id === algo)!.blurb}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="overflow-x-auto">
          <svg viewBox="0 0 580 300" className="block w-full min-w-[480px]" role="img" aria-label="Weighted graph">
            {SAMPLE_GRAPH.edges.map((e) => {
              const k = edgeKey(e.u, e.v);
              const on = highlighted.has(k);
              const hot = relaxing === k;
              const [x1, y1] = POS[e.u];
              const [x2, y2] = POS[e.v];
              return (
                <g key={k}>
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    className={hot ? "stroke-z-accent" : on ? "stroke-z-ink" : "stroke-z-ink/20"}
                    strokeWidth={hot || on ? 2.5 : 1.25}
                    strokeDasharray={hot && !dStep.relaxing?.improved ? "5 4" : undefined}
                  />
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" className="fill-z-muted font-plex text-[12px]">
                    {e.w}
                  </text>
                </g>
              );
            })}
            {SAMPLE_GRAPH.nodes.map((n) => {
              const [x, y] = POS[n];
              const isCurrent = step.current === n;
              return (
                <g key={n}>
                  <rect
                    x={x - 18} y={y - 18} width={36} height={36}
                    className={cn(
                      isCurrent ? "fill-z-accent stroke-z-accent" : done.has(n) ? "fill-z-ink stroke-z-ink" : "fill-z-raised",
                      !isCurrent && !done.has(n) && (frontier.has(n) ? "stroke-z-accent" : "stroke-z-ink/40")
                    )}
                    strokeDasharray={!isCurrent && !done.has(n) && frontier.has(n) ? "4 3" : undefined}
                  />
                  <text x={x} y={y + 5} textAnchor="middle" className={cn("font-plex text-[14px] font-medium", isCurrent || done.has(n) ? "fill-z-bg" : "fill-z-ink")}>
                    {n}
                  </text>
                  {isDijkstra && (
                    <text x={x} y={y + 34} textAnchor="middle" className="fill-z-accent font-plex text-[11px]">
                      {dStep.dist[n] === Infinity ? "∞" : dStep.dist[n]}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex flex-col gap-4 font-plex text-[12px]">
          {isDijkstra ? (
            <table className="w-full border-collapse tabular-nums">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-z-faint">
                  <th className="py-1 font-normal">Node</th>
                  <th className="py-1 font-normal">dist</th>
                  <th className="py-1 font-normal">via</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_GRAPH.nodes.map((n) => (
                  <tr key={n} className={cn("border-t border-z-ink/10", dStep.settled.includes(n) ? "text-z-ink" : "text-z-muted")}>
                    <td className="py-1">{n}{dStep.settled.includes(n) && " ■"}</td>
                    <td className="py-1">{dStep.dist[n] === Infinity ? "∞" : dStep.dist[n]}</td>
                    <td className="py-1">{dStep.prev[n] ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <>
              <div>
                <ZLabel>{algo === "bfs" ? "Queue (front first)" : "Stack (top first)"}</ZLabel>
                <p className="mt-1 min-h-[20px] text-z-ink">{tStep.frontier.join("  ") || "empty"}</p>
              </div>
              <div>
                <ZLabel>Visit order</ZLabel>
                <p className="mt-1 min-h-[20px] text-z-ink">{tStep.order.join(" → ") || "—"}</p>
              </div>
            </>
          )}
          {isDijkstra && atEnd && (
            <p className="text-z-ink">
              Shortest {start}→{target}: {pathTo(dStep.prev, target).join(" → ")} = {dStep.dist[target]}
            </p>
          )}
        </div>
      </div>

      <PlayerControls player={player} length={steps.length} note={step.note} />
    </div>
  );
}
