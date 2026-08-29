import assert from "node:assert/strict";
import { test } from "node:test";
// Explicit ".ts" so `node --test` resolves it — see the tsconfig note.
import { slugifySubject } from "./subjects.ts";

test("different castings/punctuation of the same name collapse to one slug", () => {
  assert.equal(slugifySubject("PDSA"), "pdsa");
  assert.equal(slugifySubject("pdsa"), "pdsa");
  assert.equal(slugifySubject("P.D.S.A."), "pdsa");
});

test("internal whitespace becomes a single hyphen", () => {
  assert.equal(slugifySubject("Data Structures"), "data-structures");
  assert.equal(slugifySubject("Data   Structures"), "data-structures");
});

test("leading/trailing punctuation and whitespace never leak into the slug", () => {
  assert.equal(slugifySubject("  GATE!! "), "gate");
  assert.equal(slugifySubject("-CAT-"), "cat");
});

test("a name with no alphanumeric characters slugifies to empty", () => {
  assert.equal(slugifySubject("!!!"), "");
});
