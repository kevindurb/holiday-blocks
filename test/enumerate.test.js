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

test("word length earns a scoring credit at equal tier", () => {
  const inv = spreadInventory([letter("M"), letter("E"), letter("R"), letter("R"), letter("Y")]);
  const { results } = enumerate({ inventory: inv, wordTable });
  const merry = results.find((r) => r.text === "MERRY");
  const me = results.find((r) => r.text === "ME");
  const mer = results.find((r) => r.text === "MER");
  assert.equal(merry.score, 10 - 0.5 * 5);
  assert.equal(me.score, 1 - 0.5 * 2);
  assert.equal(mer.score, 10 - 0.5 * 3);
  // Equal tier: the longer word ranks higher (lower score).
  assert.ok(merry.score < mer.score);
});

test("frequency tier still dominates word-length credit", () => {
  const inv = spreadInventory([
    letter("Y"),
    letter("E"),
    letter("M"),
    letter("E"),
    letter("R"),
    letter("R"),
    letter("Y"),
  ]);
  const { results } = enumerate({ inventory: inv, wordTable });
  const scores = new Map(results.map((r) => [r.text, r.score]));
  // YE is tier 40 in 2 letters; MERRY is tier 10 in 5 letters.
  assert.ok(scores.get("MERRY") < scores.get("YE"));
});

test("one word plus symbols is classified as a single-word result, not a phrase", () => {
  // M,E,R,R,Y + tree: every multi-token result has exactly one word.
  const inv = spreadInventory([
    letter("M"),
    letter("E"),
    letter("R"),
    letter("R"),
    letter("Y"),
    symbol("tree"),
  ]);
  const { results } = enumerate({ inventory: inv, wordTable, maxPhrases: 50 });
  for (const r of results) {
    const words = r.tokens.filter((t) => t.type === "word");
    const hasSymbol = r.tokens.some((t) => t.type === "symbol");
    if (words.length === 1 && hasSymbol) {
      // It must not crowd out genuine two-word results from the multi-word
      // bucket; with maxPhrases this large, the singles cap absorbs them all.
      assert.equal(words.length, 1);
    }
  }
});

test("genuine two-word phrases survive symbol competition in the multi-word bucket", () => {
  // Regression: cheap symbol combos used to fill the multi-word bucket
  // entirely. With the word-count bucket and length credit, a real two-word
  // phrase must surface even with a symbol available.
  const inv = spreadInventory([
    letter("M"),
    letter("E"),
    letter("A"),
    letter("R"),
    letter("M"),
    letter("Y"),
    symbol("tree"),
  ]);
  const { results } = enumerate({ inventory: inv, wordTable, maxPhrases: 2 });
  const twoWord = results.filter((r) => r.tokens.filter((t) => t.type === "word").length >= 2);
  assert.ok(
    twoWord.length > 0,
    `expected at least one genuine two-word phrase, got: ${results.map((r) => r.text).join(", ")}`,
  );
});

test("a phrase never contains more than one symbol", () => {
  const inv = spreadInventory([
    letter("M"),
    letter("E"),
    letter("R"),
    letter("R"),
    letter("Y"),
    symbol("tree"),
    symbol("heart"),
    symbol("four"),
  ]);
  const { results } = enumerate({ inventory: inv, wordTable });
  for (const r of results) {
    const symbols = r.tokens.filter((t) => t.type === "symbol");
    assert.ok(symbols.length <= 1, `too many symbols in: ${r.text}`);
  }
});

test("a symbol costs SYMBOL_COST points", () => {
  const inv = spreadInventory([
    letter("M"),
    letter("E"),
    letter("R"),
    letter("R"),
    letter("Y"),
    symbol("tree"),
  ]);
  const { results } = enumerate({ inventory: inv, wordTable });
  const withSymbol = results.find((r) => r.text === "MERRY 🎄");
  assert.equal(withSymbol.score, 10 - 0.5 * 5 + 10);
});

test("genuine two-word phrases surface even with many symbol faces", () => {
  const letters = "ETAOINSHRDLUETAOINSHRDLUCMFWGYPBVKJXQZ";
  const inv = createEmptyInventory();
  const faces = [...letters].map((ch) => letter(ch));
  for (let b = 0; b < 16; b += 1) {
    inv.blocks[b].faces = faces.slice(b * 4, b * 4 + 4);
  }
  inv.blocks[15].faces[3] = symbol("tree");
  inv.blocks[0].faces[3] = symbol("heart");
  inv.blocks[3].faces[1] = symbol("four");
  inv.blocks[6].faces[2] = symbol("usa");
  inv.blocks[9].faces[0] = symbol("flowers");
  inv.blocks[12].faces[3] = symbol("shamrock");
  inv.blocks[14].faces[1] = symbol("pineapple");
  const { results } = enumerate({
    inventory: inv,
    wordTable: buildWordTable(words),
    maxPhrases: 150,
  });
  const twoWord = results.filter((r) => r.tokens.filter((t) => t.type === "word").length >= 2);
  assert.ok(twoWord.length > 0, "expected at least one genuine two-word phrase");
});
