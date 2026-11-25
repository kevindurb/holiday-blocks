import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildWordTable,
  enumerate,
  parseWordlist,
  withAssignmentCounts,
} from "../src/enumerate.js";
import { createEmptyInventory } from "../src/model.js";

const letter = (ch) => ({ kind: "letter", ch });
const symbol = (symbol) => ({ kind: "symbol", symbol });

function spreadInventory(faces) {
  const inv = createEmptyInventory();
  faces.forEach((face, i) => {
    inv.blocks[i].faces[0] = face;
  });
  return inv;
}

const words = parseWordlist(
  ["mer 10", "merrily 50", "merry 10", "army 40", "me 1", "ye 40", "my 20"].join("\n"),
);
const wordTable = buildWordTable(words);

test("parseWordlist parses word and tier", () => {
  assert.deepEqual(words[0], { w: "mer", tier: 10 });
  assert.equal(words.length, 7);
});

test("enumerate finds spellable words", () => {
  const inv = spreadInventory([letter("M"), letter("E"), letter("R"), letter("R"), letter("Y")]);
  const { results } = enumerate({ inventory: inv, wordTable });
  const texts = results.map((r) => r.text);
  assert.ok(texts.includes("MERRY"));
  for (const r of results) {
    assert.ok(r.tokens.filter((t) => t.type === "word").length <= 4);
    assert.ok(r.tokens.length <= 16);
  }
});

test("enumerate includes symbol tokens as single-token words", () => {
  const inv = spreadInventory([
    letter("M"),
    letter("E"),
    letter("R"),
    letter("R"),
    letter("Y"),
    symbol("tree"),
  ]);
  const { results } = enumerate({ inventory: inv, wordTable });
  const texts = results.map((r) => r.text);
  assert.ok(texts.includes("MERRY 🎄"));
});

test("enumerate rejects phrases that need two faces from one block", () => {
  // Both R faces live on block 1, which also holds M; a phrase needing
  // two R's can never be laid out, even though letter counts suffice.
  const inv = createEmptyInventory();
  inv.blocks[0].faces = [letter("M"), letter("R"), letter("R"), null];
  inv.blocks[1].faces = [letter("E"), letter("Y"), null, null];
  const { results } = enumerate({ inventory: inv, wordTable });
  const texts = results.map((r) => r.text);
  assert.ok(!texts.includes("MERRY"));
  assert.ok(texts.includes("ME"));
  assert.ok(texts.includes("MY"));
});

test("symbol token requires a block not used by the words", () => {
  // The tree shares a block with M; spelling ME consumes both blocks,
  // leaving no block for the tree.
  const inv = createEmptyInventory();
  inv.blocks[0].faces = [letter("M"), symbol("tree"), null, null];
  inv.blocks[1].faces = [letter("E"), null, null, null];
  const { results } = enumerate({ inventory: inv, wordTable });
  assert.ok(!results.map((r) => r.text).includes("ME 🎄"));
  assert.ok(results.map((r) => r.text).includes("ME"));
});

test("symbol token works when its block is free", () => {
  const inv = createEmptyInventory();
  inv.blocks[0].faces = [letter("M"), null, null, null];
  inv.blocks[1].faces = [letter("E"), null, null, null];
  inv.blocks[2].faces = [symbol("tree"), null, null, null];
  const { results } = enumerate({ inventory: inv, wordTable });
  assert.ok(results.map((r) => r.text).includes("ME 🎄"));
});

test("enumerate produces multi-word phrases from remaining blocks", () => {
  const inv = spreadInventory([
    letter("M"),
    letter("E"),
    letter("R"),
    letter("R"),
    letter("Y"),
    letter("M"),
    letter("E"),
  ]);
  const { results } = enumerate({ inventory: inv, wordTable });
  const texts = results.map((r) => r.text);
  assert.ok(texts.includes("MERRY ME") || texts.includes("ME MERRY"));
});

test("enumerate caps phrases at 4 words and 16 blocks", () => {
  // 16 blocks, all with common letters: results must never exceed the caps.
  const inv = spreadInventory([..."AABBCCDDEEFFGGHH".split("").map((c) => letter(c))]);
  const { results } = enumerate({ inventory: inv, wordTable });
  for (const r of results) {
    const words = r.tokens.filter((t) => t.type === "word");
    assert.ok(words.length <= 4);
    assert.ok(r.tokens.length <= 16);
  }
});

test("enumerate respects maxPhrases cap", () => {
  const inv = spreadInventory([..."MMMEEERRYYAAIITT".split("").map((c) => letter(c))]);
  const { results } = enumerate({ inventory: inv, wordTable, maxPhrases: 3 });
  assert.ok(results.length <= 6); // singles + multis buckets, 3 each
});

test("cancellation stops the search and reports truncation", () => {
  const inv = spreadInventory([
    letter("M"),
    letter("E"),
    letter("R"),
    letter("R"),
    letter("Y"),
    letter("M"),
  ]);
  const { truncated } = enumerate({ inventory: inv, wordTable, shouldCancel: () => true });
  assert.equal(truncated, true);
});

test("results are ranked by ascending score", () => {
  const inv = spreadInventory([
    letter("M"),
    letter("E"),
    letter("R"),
    letter("R"),
    letter("Y"),
    letter("M"),
  ]);
  const { results } = enumerate({ inventory: inv, wordTable });
  const scores = results.map((r) => r.score);
  assert.deepEqual(
    [...scores].sort((a, b) => a - b),
    scores,
  );
});

test("withAssignmentCounts attaches solution counts", () => {
  const inv = spreadInventory([letter("M"), letter("E"), letter("R"), letter("R"), letter("Y")]);
  const [phrase] = enumerate({ inventory: inv, wordTable }).results.filter(
    (r) => r.text === "MERRY",
  );
  const [counted] = withAssignmentCounts(inv, [phrase]);
  assert.equal(counted.assignments, 2);
});
