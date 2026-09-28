/** Step traces for the GATE DA PDSA visualisers.
 *
 * Each function runs the real algorithm and records a snapshot at every
 * decision (compare, swap, probe, visit), so the UI only replays a list. That
 * keeps the animation honest: the counts it shows are the algorithm's actual
 * counts, and the traces are unit-tested here instead of trusted to a
 * hand-built animation. */

// ---------------------------------------------------------------- sorting

export type SortAlgorithm = "selection" | "bubble" | "insertion" | "merge" | "quick";

export interface SortStep {
  array: number[];
  /** Indices being compared. */
  compare?: [number, number];
  /** Indices just swapped. */
  swap?: [number, number];
  /** Index just written from the merge buffer. */
  write?: number;
  /** Index of the current quicksort pivot. */
  pivot?: number;
  /** The subarray the algorithm is working on, inclusive. */
  range?: [number, number];
  /** Indices already in their final position. */
  sorted: number[];
  comparisons: number;
  /** Swaps plus merge writes: the element moves the algorithm made. */
  moves: number;
  note: string;
}

export function sortSteps(algorithm: SortAlgorithm, input: readonly number[]): SortStep[] {
  const a = input.slice();
  const steps: SortStep[] = [];
  const settled = new Set<number>();
  let comparisons = 0;
  let moves = 0;

  const push = (step: Omit<SortStep, "array" | "sorted" | "comparisons" | "moves">) =>
    steps.push({ array: a.slice(), sorted: [...settled].sort((x, y) => x - y), comparisons, moves, ...step });

  const compare = (i: number, j: number, range?: [number, number], pivot?: number) => {
    comparisons++;
    push({ compare: [i, j], range, pivot, note: `Compare ${a[i]} with ${a[j]}` });
    return a[i] - a[j];
  };

  const swap = (i: number, j: number, note: string, range?: [number, number], pivot?: number) => {
    [a[i], a[j]] = [a[j], a[i]];
    moves++;
    push({ swap: [i, j], range, pivot, note });
  };

  push({ note: `Start: ${a.length} values` });
  const n = a.length;

  switch (algorithm) {
    case "selection":
      for (let i = 0; i < n - 1; i++) {
        let min = i;
        for (let j = i + 1; j < n; j++) {
          if (compare(j, min, [i, n - 1]) < 0) min = j;
        }
        if (min !== i) swap(i, min, `Smallest remaining is ${a[min]}; swap it into position ${i}`, [i, n - 1]);
        settled.add(i);
        push({ range: [i, n - 1], note: `Position ${i} is final: ${a[i]}` });
      }
      break;

    case "bubble":
      for (let pass = 0; pass < n - 1; pass++) {
        let swapped = false;
        for (let j = 0; j < n - 1 - pass; j++) {
          if (compare(j, j + 1, [0, n - 1 - pass]) > 0) {
            swap(j, j + 1, `${a[j + 1]} > ${a[j]}, swap`, [0, n - 1 - pass]);
            swapped = true;
          }
        }
        settled.add(n - 1 - pass);
        if (!swapped) {
          push({ note: `No swaps in pass ${pass + 1}, so the rest is already in order` });
          break;
        }
        push({ note: `Pass ${pass + 1} done: ${a[n - 1 - pass]} has bubbled to the end` });
      }
      break;

    case "insertion":
      for (let i = 1; i < n; i++) {
        let j = i;
        while (j > 0 && compare(j - 1, j, [0, i]) > 0) {
          swap(j - 1, j, `${a[j]} is bigger, shift it right`, [0, i]);
          j--;
        }
        push({ range: [0, i], note: `First ${i + 1} values are in order among themselves` });
      }
      break;

    case "merge": {
      const mergeSort = (lo: number, hi: number) => {
        if (lo >= hi) return;
        const mid = Math.floor((lo + hi) / 2);
        mergeSort(lo, mid);
        mergeSort(mid + 1, hi);
        const left = a.slice(lo, mid + 1);
        const right = a.slice(mid + 1, hi + 1);
        push({ range: [lo, hi], note: `Merge [${left.join(", ")}] and [${right.join(", ")}]` });
        let i = 0;
        let j = 0;
        let k = lo;
        while (i < left.length && j < right.length) {
          comparisons++;
          const l = left[i];
          const r = right[j];
          // <= keeps equal values in their original order: mergesort is stable.
          a[k] = l <= r ? left[i++] : right[j++];
          moves++;
          push({ write: k, range: [lo, hi], note: `${l} vs ${r}: take ${a[k]}` });
          k++;
        }
        while (i < left.length) {
          a[k] = left[i++];
          moves++;
          push({ write: k, range: [lo, hi], note: `Copy leftover ${a[k]}` });
          k++;
        }
        while (j < right.length) {
          a[k] = right[j++];
          moves++;
          push({ write: k, range: [lo, hi], note: `Copy leftover ${a[k]}` });
          k++;
        }
      };
      mergeSort(0, n - 1);
      break;
    }

    case "quick": {
      const quick = (lo: number, hi: number) => {
        if (lo > hi) return;
        if (lo === hi) {
          settled.add(lo);
          return;
        }
        const pivotValue = a[hi];
        push({ range: [lo, hi], pivot: hi, note: `Pivot ${pivotValue} (last element of the range)` });
        let i = lo;
        for (let j = lo; j < hi; j++) {
          if (compare(j, hi, [lo, hi], hi) < 0) {
            if (i !== j) swap(i, j, `${a[j]} < ${pivotValue}, move it left of the boundary`, [lo, hi], hi);
            i++;
          }
        }
        if (i !== hi) swap(i, hi, `Put pivot ${pivotValue} at index ${i}`, [lo, hi], i);
        settled.add(i);
        push({ range: [lo, hi], pivot: i, note: `${pivotValue} is final: smaller values left, larger right` });
        quick(lo, i - 1);
        quick(i + 1, hi);
      };
      quick(0, n - 1);
      break;
    }
  }

  for (let i = 0; i < n; i++) settled.add(i);
  push({ note: `Sorted: ${comparisons} comparisons, ${moves} moves` });
  return steps;
}

// ---------------------------------------------------------------- searching

export interface SearchStep {
  probe?: number;
  lo?: number;
  hi?: number;
  /** Indices the search has proved can't hold the target. */
  ruledOut: number[];
  found?: number;
  probes: number;
  done: boolean;
  note: string;
}

export function linearSearchSteps(a: readonly number[], target: number): SearchStep[] {
  const steps: SearchStep[] = [{ ruledOut: [], probes: 0, done: false, note: `Look for ${target} from the left` }];
  const ruledOut: number[] = [];
  for (let i = 0; i < a.length; i++) {
    const probes = i + 1;
    if (a[i] === target) {
      steps.push({ probe: i, ruledOut: [...ruledOut], found: i, probes, done: true, note: `Found ${target} at index ${i} after ${probes} probes` });
      return steps;
    }
    ruledOut.push(i);
    steps.push({ probe: i, ruledOut: [...ruledOut], probes, done: false, note: `a[${i}] = ${a[i]}, not it` });
  }
  steps.push({ ruledOut: [...ruledOut], probes: a.length, done: true, note: `${target} isn't here: checked all ${a.length}` });
  return steps;
}

/** Expects `a` sorted ascending. */
export function binarySearchSteps(a: readonly number[], target: number): SearchStep[] {
  let lo = 0;
  let hi = a.length - 1;
  let probes = 0;
  const ruledOut = new Set<number>();
  const snapshot = () => [...ruledOut].sort((x, y) => x - y);
  const steps: SearchStep[] = [{ lo, hi, ruledOut: [], probes, done: false, note: `Look for ${target} in a sorted array of ${a.length}` }];

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    probes++;
    if (a[mid] === target) {
      steps.push({ probe: mid, lo, hi, ruledOut: snapshot(), found: mid, probes, done: true, note: `a[${mid}] = ${target}. Found after ${probes} probes` });
      return steps;
    }
    if (a[mid] < target) {
      for (let k = lo; k <= mid; k++) ruledOut.add(k);
      steps.push({ probe: mid, lo, hi, ruledOut: snapshot(), probes, done: false, note: `a[${mid}] = ${a[mid]} < ${target}: drop the left half` });
      lo = mid + 1;
    } else {
      for (let k = mid; k <= hi; k++) ruledOut.add(k);
      steps.push({ probe: mid, lo, hi, ruledOut: snapshot(), probes, done: false, note: `a[${mid}] = ${a[mid]} > ${target}: drop the right half` });
      hi = mid - 1;
    }
  }
  steps.push({ lo, hi, ruledOut: snapshot(), probes, done: true, note: `${target} isn't here: the range is empty after ${probes} probes` });
  return steps;
}

// ---------------------------------------------------------------- hashing

export type CollisionStrategy = "chaining" | "linear-probing";

export interface HashStep {
  /** Buckets. With linear probing each bucket holds at most one key. */
  table: number[][];
  key?: number;
  home?: number;
  /** Buckets inspected for this key, in order. */
  probes: number[];
  placedAt?: number;
  /** Running total of collisions so far. */
  collisions: number;
  note: string;
}

export function hashSteps(keys: readonly number[], size: number, strategy: CollisionStrategy): HashStep[] {
  const table: number[][] = Array.from({ length: size }, () => []);
  let collisions = 0;
  const copy = () => table.map((b) => b.slice());
  const steps: HashStep[] = [{ table: copy(), probes: [], collisions, note: `Empty table of ${size} buckets, h(k) = k mod ${size}` }];

  for (const key of keys) {
    const home = ((key % size) + size) % size;
    if (strategy === "chaining") {
      const collided = table[home].length > 0;
      if (collided) collisions++;
      table[home].push(key);
      steps.push({
        table: copy(), key, home, probes: [home], placedAt: home, collisions,
        note: collided ? `${key} mod ${size} = ${home}: taken, chain it` : `${key} mod ${size} = ${home}`,
      });
      continue;
    }
    const probes: number[] = [];
    let placed: number | undefined;
    for (let i = 0; i < size; i++) {
      const slot = (home + i) % size;
      probes.push(slot);
      if (table[slot].length === 0) {
        placed = slot;
        break;
      }
      collisions++;
    }
    if (placed === undefined) {
      steps.push({ table: copy(), key, home, probes, collisions, note: `Table full: ${key} can't be placed` });
      continue;
    }
    table[placed].push(key);
    steps.push({
      table: copy(), key, home, probes, placedAt: placed, collisions,
      note:
        placed === home
          ? `${key} mod ${size} = ${home}`
          : `${key} mod ${size} = ${home}: taken, probed ${probes.length - 1} more to reach ${placed}`,
    });
  }
  return steps;
}

// ---------------------------------------------------------------- binary search tree

export interface BstNode {
  key: number;
  left: number | null;
  right: number | null;
}

export interface BstStep {
  nodes: BstNode[];
  /** Node indices visited while looking for the insertion point. */
  path: number[];
  inserted?: number;
  note: string;
}

export function bstInsertSteps(keys: readonly number[]): BstStep[] {
  const nodes: BstNode[] = [];
  const copy = () => nodes.map((n) => ({ ...n }));
  const steps: BstStep[] = [{ nodes: [], path: [], note: "Empty tree" }];

  for (const key of keys) {
    if (nodes.length === 0) {
      nodes.push({ key, left: null, right: null });
      steps.push({ nodes: copy(), path: [], inserted: 0, note: `${key} becomes the root` });
      continue;
    }
    const path: number[] = [];
    let at = 0;
    for (;;) {
      path.push(at);
      const node = nodes[at];
      if (key === node.key) {
        steps.push({ nodes: copy(), path: [...path], note: `${key} is already in the tree` });
        break;
      }
      const side = key < node.key ? "left" : "right";
      const next = node[side];
      if (next === null) {
        nodes.push({ key, left: null, right: null });
        node[side] = nodes.length - 1;
        steps.push({
          nodes: copy(), path: [...path], inserted: nodes.length - 1,
          note: `${key} ${side === "left" ? "<" : ">"} ${node.key}, empty ${side} child: insert here`,
        });
        break;
      }
      at = next;
    }
  }
  return steps;
}

export type TreeOrder = "inorder" | "preorder" | "postorder" | "level";

/** Node indices in the requested order. */
export function bstTraversal(nodes: readonly BstNode[], order: TreeOrder): number[] {
  if (nodes.length === 0) return [];
  const out: number[] = [];
  if (order === "level") {
    const queue = [0];
    while (queue.length) {
      const i = queue.shift()!;
      out.push(i);
      const { left, right } = nodes[i];
      if (left !== null) queue.push(left);
      if (right !== null) queue.push(right);
    }
    return out;
  }
  const walk = (i: number | null) => {
    if (i === null) return;
    if (order === "preorder") out.push(i);
    walk(nodes[i].left);
    if (order === "inorder") out.push(i);
    walk(nodes[i].right);
    if (order === "postorder") out.push(i);
  };
  walk(0);
  return out;
}

/** x = inorder rank, y = depth: a layout where no two nodes overlap and
 * every left child sits left of its parent. */
export function bstLayout(nodes: readonly BstNode[]): { x: number; depth: number }[] {
  const pos: { x: number; depth: number }[] = nodes.map(() => ({ x: 0, depth: 0 }));
  let rank = 0;
  const walk = (i: number | null, depth: number) => {
    if (i === null) return;
    walk(nodes[i].left, depth + 1);
    pos[i] = { x: rank++, depth };
    walk(nodes[i].right, depth + 1);
  };
  if (nodes.length) walk(0, 0);
  return pos;
}

// ---------------------------------------------------------------- graphs

export interface WeightedEdge {
  u: string;
  v: string;
  w: number;
}

export interface Graph {
  nodes: string[];
  edges: WeightedEdge[];
}

/** Undirected neighbours, alphabetical so every trace is deterministic. */
export function neighbours(g: Graph, node: string): { node: string; w: number }[] {
  const out: { node: string; w: number }[] = [];
  for (const e of g.edges) {
    if (e.u === node) out.push({ node: e.v, w: e.w });
    else if (e.v === node) out.push({ node: e.u, w: e.w });
  }
  return out.sort((x, y) => x.node.localeCompare(y.node));
}

export interface TraversalStep {
  current?: string;
  visited: string[];
  /** Queue (BFS) or stack (DFS), front/top first. */
  frontier: string[];
  order: string[];
  treeEdges: [string, string][];
  note: string;
}

export function bfsSteps(g: Graph, start: string): TraversalStep[] {
  const visited = new Set([start]);
  const queue = [start];
  const order: string[] = [];
  const treeEdges: [string, string][] = [];
  const steps: TraversalStep[] = [
    { visited: [start], frontier: [start], order: [], treeEdges: [], note: `Queue starts with ${start}` },
  ];
  while (queue.length) {
    const current = queue.shift()!;
    order.push(current);
    const found: string[] = [];
    for (const { node } of neighbours(g, current)) {
      if (!visited.has(node)) {
        visited.add(node);
        queue.push(node);
        treeEdges.push([current, node]);
        found.push(node);
      }
    }
    steps.push({
      current, visited: [...visited], frontier: [...queue], order: [...order], treeEdges: treeEdges.map((e) => [...e] as [string, string]),
      note: found.length ? `Dequeue ${current}, enqueue ${found.join(", ")}` : `Dequeue ${current}, nothing new next to it`,
    });
  }
  return steps;
}

export function dfsSteps(g: Graph, start: string): TraversalStep[] {
  const visited = new Set<string>();
  const stack: { node: string; from?: string }[] = [{ node: start }];
  const order: string[] = [];
  const treeEdges: [string, string][] = [];
  const steps: TraversalStep[] = [
    { visited: [], frontier: [start], order: [], treeEdges: [], note: `Stack starts with ${start}` },
  ];
  while (stack.length) {
    const { node: current, from } = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    order.push(current);
    if (from) treeEdges.push([from, current]);
    // Push in reverse so the alphabetically first neighbour is explored
    // first, matching the recursive version's order.
    const next = neighbours(g, current).map((x) => x.node).filter((x) => !visited.has(x)).reverse();
    for (const node of next) stack.push({ node, from: current });
    steps.push({
      current, visited: [...visited], frontier: stack.map((s) => s.node).reverse(), order: [...order],
      treeEdges: treeEdges.map((e) => [...e] as [string, string]),
      note: next.length ? `Visit ${current}, push ${[...next].reverse().join(", ")}` : `Visit ${current}, dead end: backtrack`,
    });
  }
  return steps;
}

export interface DijkstraStep {
  current?: string;
  dist: Record<string, number>;
  prev: Record<string, string | null>;
  settled: string[];
  relaxing?: { u: string; v: string; w: number; improved: boolean };
  note: string;
}

export function dijkstraSteps(g: Graph, start: string): DijkstraStep[] {
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  for (const n of g.nodes) {
    dist[n] = Infinity;
    prev[n] = null;
  }
  dist[start] = 0;
  const settled = new Set<string>();
  const snap = (extra: Omit<DijkstraStep, "dist" | "prev" | "settled">): DijkstraStep => ({
    dist: { ...dist }, prev: { ...prev }, settled: [...settled], ...extra,
  });
  const steps: DijkstraStep[] = [snap({ note: `dist(${start}) = 0, everything else ∞` })];

  for (;;) {
    let current: string | undefined;
    for (const n of [...g.nodes].sort()) {
      if (!settled.has(n) && dist[n] < Infinity && (current === undefined || dist[n] < dist[current])) current = n;
    }
    if (current === undefined) break;
    settled.add(current);
    steps.push(snap({ current, note: `Settle ${current}: nothing unsettled is closer (${dist[current]})` }));
    for (const { node, w } of neighbours(g, current)) {
      if (settled.has(node)) continue;
      const candidate = dist[current] + w;
      const improved = candidate < dist[node];
      if (improved) {
        dist[node] = candidate;
        prev[node] = current;
      }
      steps.push(snap({
        current, relaxing: { u: current, v: node, w, improved },
        note: improved
          ? `${current}→${node}: ${dist[current]} + ${w} = ${candidate}, better`
          : `${current}→${node}: ${dist[current]} + ${w} = ${candidate}, no better than ${dist[node]}`,
      }));
    }
  }
  return steps;
}

export function pathTo(prev: Record<string, string | null>, target: string): string[] {
  const path: string[] = [];
  let at: string | null = target;
  const seen = new Set<string>();
  while (at !== null && !seen.has(at)) {
    seen.add(at);
    path.unshift(at);
    at = prev[at] ?? null;
  }
  return path;
}

/** The graph the visualiser opens with: small enough to read, with one
 * shortcut (A→C→B beats A→B) so Dijkstra has something to find. */
export const SAMPLE_GRAPH: Graph = {
  nodes: ["A", "B", "C", "D", "E", "F", "G"],
  edges: [
    { u: "A", v: "B", w: 4 },
    { u: "A", v: "C", w: 2 },
    { u: "B", v: "C", w: 1 },
    { u: "B", v: "D", w: 5 },
    { u: "C", v: "E", w: 10 },
    { u: "D", v: "E", w: 2 },
    { u: "D", v: "F", w: 6 },
    { u: "E", v: "G", w: 3 },
    { u: "F", v: "G", w: 1 },
  ],
};
