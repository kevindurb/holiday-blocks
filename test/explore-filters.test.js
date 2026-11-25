import assert from "node:assert/strict";
import { test } from "node:test";

import { defaultFilters, matchesResult } from "../src/explore-filters.js";

const word = (value) => ({ type: "word", value });
const symbol = (value) => ({ type: "symbol", value });
const entry = (tokens, text) => ({
  tokens,
  text: text ?? tokens.map((t) => (t.type === "word" ? t.value : t.value)).join(" "),
});

const merrTree = entry([word("MERRY"), symbol("tree")], "MERRY 🌲");
const at = entry([word("AT")], "AT");
const merry = entry([word("MERRY")], "MERRY");
const twoWords = entry([word("MERRY"), word("CHRISTMAS")], "MERRY CHRISTMAS");
const mixedShort = entry([word("GO"), word("MERRY")], "GO MERRY");
const symbolOnly = entry([symbol("tree"), symbol("heart")], "🌲 ❤️");

test("default filters hide sub-3-letter words but keep real results", () => {
  const filters = defaultFilters();
  assert.equal(matchesResult(at, filters), false);
  assert.equal(matchesResult(mixedShort, filters), false);
  assert.equal(matchesResult(merry, filters), true);
  assert.equal(matchesResult(twoWords, filters), true);
  assert.equal(matchesResult(merrTree, filters), true);
});

test("min letters per word can be lowered to 1 to see everything", () => {
  const filters = { ...defaultFilters(), minLettersPerWord: 1 };
  assert.equal(matchesResult(at, filters), true);
  assert.equal(matchesResult(mixedShort, filters), true);
});

test("min words filter requires at least N word tokens", () => {
  const filters = { ...defaultFilters(), minLettersPerWord: 1, minWords: 2 };
  assert.equal(matchesResult(merry, filters), false);
  assert.equal(matchesResult(twoWords, filters), true);
  assert.equal(matchesResult(merrTree, filters), false); // 1 word + 1 symbol
});

test("min words of 0 admits symbol-only results", () => {
  const filters = { ...defaultFilters(), minWords: 0, minTotalLetters: 0 };
  assert.equal(matchesResult(symbolOnly, filters), true);
});

test("min total letters filters on summed word letters only", () => {
  const filters = { ...defaultFilters(), minLettersPerWord: 1, minTotalLetters: 10 };
  assert.equal(matchesResult(merry, filters), false); // 5
  assert.equal(matchesResult(twoWords, filters), true); // 5 + 9
  assert.equal(matchesResult(merrTree, filters), false); // 5 letters, symbol does not count
});

test("symbol mode includes only results with a symbol", () => {
  const filters = { ...defaultFilters(), symbolMode: "includes" };
  assert.equal(matchesResult(merrTree, filters), true);
  assert.equal(matchesResult(merry, filters), false);
});

test("symbol mode excludes any result with a symbol", () => {
  const filters = { ...defaultFilters(), symbolMode: "excludes" };
  assert.equal(matchesResult(merrTree, filters), false);
  assert.equal(matchesResult(merry, filters), true);
});

test("symbol tokens are exempt from the letters-per-word rule", () => {
  const filters = { ...defaultFilters(), minLettersPerWord: 5 };
  const symbolHeavy = entry([word("MERRY"), symbol("tree")], "MERRY 🌲");
  assert.equal(matchesResult(symbolHeavy, filters), true);
});

test("symbol-only results carry no offending word and pass letter rules", () => {
  const filters = { ...defaultFilters(), minWords: 0, minTotalLetters: 0, minLettersPerWord: 5 };
  assert.equal(matchesResult(symbolOnly, filters), true);
});

test("filters combine conjunctively", () => {
  const filters = {
    minWords: 2,
    minLettersPerWord: 5,
    minTotalLetters: 11,
    symbolMode: "excludes",
    query: "",
  };
  assert.equal(matchesResult(twoWords, filters), true); // 5 + 9 = 14 ≥ 11
  assert.equal(matchesResult(mixedShort, filters), false); // GO too short
  const christmasTree = entry(
    [word("MERRY"), word("CHRISTMAS"), symbol("tree")],
    "MERRY CHRISTMAS 🌲",
  );
  assert.equal(matchesResult(christmasTree, filters), false); // has a symbol
});

test("search is a case-insensitive substring of the displayed text", () => {
  const filters = { ...defaultFilters(), query: "merr" };
  assert.equal(matchesResult(merrTree, filters), true);
  assert.equal(matchesResult(twoWords, filters), true);
  assert.equal(matchesResult(at, { ...filters, minLettersPerWord: 1 }), false);
  const upper = { ...defaultFilters(), query: "MERRY" };
  assert.equal(matchesResult(merry, upper), true);
});

test("default filters match the spec: 3-letter floor, nothing else active", () => {
  assert.deepEqual(defaultFilters(), {
    minWords: 1,
    minLettersPerWord: 3,
    minTotalLetters: 1,
    symbolMode: "any",
    query: "",
  });
});
