import assert from "node:assert/strict";
import { test } from "node:test";

import { canFit, solve, tokenize, unmatchedTokens } from "../src/solver.js";
import { createEmptyInventory } from "../src/model.js";

const letter = (ch) => ({ kind: "letter", ch });
const symbol = (symbol) => ({ kind: "symbol", symbol });

// One face per block, in the order given; the rest of each block stays empty.
function spreadInventory(faces) {
  const inv = createEmptyInventory();
  faces.forEach((face, i) => {
    inv.blocks[i].faces[0] = face;
  });
  return inv;
}

test("tokenize splits words and ignores punctuation and spaces", () => {
  const { tokens, tooLong } = tokenize("  merry,  CHRISTMAS!  ");
  assert.deepEqual(tokens, [
    { type: "word", value: "MERRY" },
    { type: "word", value: "CHRISTMAS" },
  ]);
  assert.equal(tooLong, false);
});

test("tokenize maps glyphs and the digit 4 to symbol tokens", () => {
  const { tokens } = tokenize("MERRY 🎄");
  assert.deepEqual(tokens[1], { type: "symbol", value: "tree" });
  const digit = tokenize("HAPPY 4TH");
  assert.deepEqual(digit.tokens[1], { type: "symbol", value: "four" });
  assert.deepEqual(digit.tokens[2], { type: "word", value: "TH" });
});

test("tokenize flags phrases longer than 16 blocks", () => {
  const { tooLong } = tokenize("ABCDEFGHIJKLMNOPQ");
  assert.equal(tooLong, true);
});

test("solve finds the single assignment for unique letters", () => {
  const inv = spreadInventory([letter("C"), letter("A"), letter("B")]);
  const { tokens } = tokenize("CAB");
  const { solutions, truncated } = solve(inv, tokens);
  assert.equal(solutions.length, 1);
  assert.equal(truncated, false);
  assert.deepEqual(
    solutions[0].map((s) => s.block),
    [1, 2, 3],
  );
});

test("solve finds every assignment when faces interchange", () => {
  const inv = spreadInventory([letter("M"), letter("E"), letter("R"), letter("R"), letter("Y")]);
  const { tokens } = tokenize("MERRY");
  const { solutions } = solve(inv, tokens);
  assert.equal(solutions.length, 2);
  const blockSets = solutions.map((s) => s.map((a) => a.block).join(","));
  assert.deepEqual(new Set(blockSets).size, 2);
});

test("solve reports zero solutions for an unspellable phrase", () => {
  const inv = spreadInventory([letter("M"), letter("E"), letter("Y")]);
  const { tokens } = tokenize("MERRY");
  assert.equal(solve(inv, tokens).solutions.length, 0);
});

test("solve honors the solution limit and reports truncation", () => {
  const inv = spreadInventory([letter("M"), letter("E"), letter("R"), letter("R"), letter("Y")]);
  const { tokens } = tokenize("MERRY");
  const { solutions, truncated } = solve(inv, tokens, { limit: 1 });
  assert.equal(solutions.length, 1);
  assert.equal(truncated, true);
});

test("symbols match only their own face and consume a block", () => {
  const inv = spreadInventory([
    letter("M"),
    letter("E"),
    letter("R"),
    letter("R"),
    letter("Y"),
    symbol("tree"),
  ]);
  const { tokens } = tokenize("MERRY 🎄");
  const { solutions } = solve(inv, tokens);
  assert.equal(solutions.length, 2);
  const symbolAssignment = solutions[0].at(-1);
  assert.equal(symbolAssignment.block, 6);
  assert.equal(symbolAssignment.face.symbol, "tree");
});

test("symbols do not match the wrong symbol face", () => {
  const inv = spreadInventory([
    letter("M"),
    letter("E"),
    letter("R"),
    letter("R"),
    letter("Y"),
    symbol("heart"),
  ]);
  const { tokens } = tokenize("MERRY 🎄");
  assert.equal(solve(inv, tokens).solutions.length, 0);
});

test("canFit rejects impossible phrases cheaply and accepts possible ones", () => {
  const inv = spreadInventory([letter("M"), letter("E"), letter("R"), letter("R"), letter("Y")]);
  const ok = tokenize("MERRY").tokens;
  const notOk = tokenize("MERRY 🎄").tokens;
  assert.equal(canFit(ok, inv), true);
  assert.equal(canFit(notOk, inv), false);
});

test("unmatchedTokens names the tokens that cannot be satisfied", () => {
  const inv = spreadInventory([letter("M"), letter("E")]);
  const { tokens } = tokenize("ME ZEBRA");
  const missing = unmatchedTokens(tokens, inv);
  assert.deepEqual(
    missing.map((t) => t.value),
    ["ZEBRA"],
  );
});
