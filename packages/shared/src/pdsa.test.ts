import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  SAMPLE_GRAPH,
  bfsSteps,
  binarySearchSteps,
  bstInsertSteps,
  bstLayout,
  bstTraversal,
  dfsSteps,
  dijkstraSteps,
  hashSteps,
  linearSearchSteps,
  pathTo,
  sortSteps,
  type SortAlgorithm,
} from "./pdsa.ts";

const end = <T>(xs: readonly T[]): T => xs[xs.length - 1];

const ALGORITHMS: SortAlgorithm[] = ["selection", "bubble", "insertion", "merge", "quick"];
const INPUTS = [
  [5, 3, 8, 1, 9, 2, 7],
  [1, 2, 3, 4, 5],
  [5, 4, 3, 2, 1],
  [4, 1, 4, 2, 1, 3],
  [7],
  [],
];

for (const algorithm of ALGORITHMS) {
  test(`${algorithm} sort ends sorted, with every index settled`, () => {
    for (const input of INPUTS) {
      const steps = sortSteps(algorithm, input);
      const last = steps[steps.length - 1];
      assert.deepEqual(last.array, [...input].sort((a, b) => a - b), `${algorithm} on [${input}]`);
      assert.deepEqual(last.sorted, input.map((_, i) => i));
      assert.deepEqual(steps[0].array, input, "first step shows the untouched input");
    }
  });

  test(`${algorithm} sort never lowers its running counts`, () => {
    const steps = sortSteps(algorithm, INPUTS[0]);
    for (let i = 1; i < steps.length; i++) {
      assert.ok(steps[i].comparisons >= steps[i - 1].comparisons);
      assert.ok(steps[i].moves >= steps[i - 1].moves);
    }
  });
}

test("selection sort always makes n(n-1)/2 comparisons", () => {
  const steps = sortSteps("selection", [5, 3, 8, 1, 9, 2, 7]);
  assert.equal(end(steps).comparisons, 21);
});

test("bubble and insertion sort finish an already-sorted array in n-1 comparisons, no moves", () => {
  for (const algorithm of ["bubble", "insertion"] as const) {
    const last = end(sortSteps(algorithm, [1, 2, 3, 4, 5]));
    assert.equal(last.comparisons, 4, algorithm);
    assert.equal(last.moves, 0, algorithm);
  }
});

test("linear search probes left to right and stops at the first match", () => {
  const steps = linearSearchSteps([4, 8, 15, 16, 23, 42], 16);
  const last = end(steps);
  assert.equal(last.found, 3);
  assert.equal(last.probes, 4);
  assert.equal(last.done, true);
});

test("binary search finds a value in ⌈log2(n+1)⌉ probes or fewer", () => {
  const a = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
  for (const target of a) {
    const last = end(binarySearchSteps(a, target));
    assert.equal(a[last.found!], target);
    assert.ok(last.probes <= 4, `${target} took ${last.probes}`);
  }
});

test("binary search reports a miss once the range is empty", () => {
  const last = end(binarySearchSteps([2, 5, 8, 12], 9));
  assert.equal(last.found, undefined);
  assert.equal(last.done, true);
  assert.ok(last.lo! > last.hi!);
});

test("chaining puts colliding keys in the same bucket", () => {
  const last = end(hashSteps([10, 3, 17, 24], 7, "chaining"));
  assert.deepEqual(last.table[3], [10, 3, 17, 24]);
  assert.equal(last.collisions, 3);
});

test("linear probing walks to the next free slot, wrapping around", () => {
  const steps = hashSteps([6, 13, 20], 7, "linear-probing");
  const last = end(steps);
  assert.deepEqual(last.table.map((b: number[]) => b[0] ?? null), [13, 20, null, null, null, null, 6]);
  assert.deepEqual(last.probes, [6, 0, 1]);
  assert.equal(last.collisions, 3);
});

test("linear probing reports a full table instead of looping", () => {
  const last = end(hashSteps([1, 2, 3], 2, "linear-probing"));
  assert.equal(last.placedAt, undefined);
  assert.match(last.note, /full/);
});

test("BST inorder traversal is sorted; duplicates are not inserted twice", () => {
  const steps = bstInsertSteps([50, 30, 70, 20, 40, 60, 80, 40]);
  const { nodes } = end(steps);
  assert.equal(nodes.length, 7);
  assert.deepEqual(bstTraversal(nodes, "inorder").map((i) => nodes[i].key), [20, 30, 40, 50, 60, 70, 80]);
  assert.deepEqual(bstTraversal(nodes, "preorder").map((i) => nodes[i].key), [50, 30, 20, 40, 70, 60, 80]);
  assert.deepEqual(bstTraversal(nodes, "postorder").map((i) => nodes[i].key), [20, 40, 30, 60, 80, 70, 50]);
  assert.deepEqual(bstTraversal(nodes, "level").map((i) => nodes[i].key), [50, 30, 70, 20, 40, 60, 80]);
});

test("BST layout gives every node its own column", () => {
  const { nodes } = end(bstInsertSteps([5, 2, 8, 1, 9]));
  const xs = bstLayout(nodes).map((p) => p.x);
  assert.equal(new Set(xs).size, nodes.length);
});

test("BFS on the sample graph visits level by level", () => {
  assert.deepEqual(end(bfsSteps(SAMPLE_GRAPH, "A")).order, ["A", "B", "C", "D", "E", "F", "G"]);
});

test("DFS on the sample graph goes deep first, alphabetical at each fork", () => {
  assert.deepEqual(end(dfsSteps(SAMPLE_GRAPH, "A")).order, ["A", "B", "C", "E", "D", "F", "G"]);
});

test("Dijkstra finds the A→C→B shortcut and the right distances", () => {
  const last = end(dijkstraSteps(SAMPLE_GRAPH, "A"));
  assert.deepEqual(last.dist, { A: 0, B: 3, C: 2, D: 8, E: 10, F: 14, G: 13 });
  assert.deepEqual(pathTo(last.prev, "B"), ["A", "C", "B"]);
  assert.deepEqual(pathTo(last.prev, "G"), ["A", "C", "B", "D", "E", "G"]);
  assert.equal(last.settled.length, 7);
});
