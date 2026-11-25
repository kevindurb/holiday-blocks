import assert from "node:assert/strict";
import { test } from "node:test";

import {
  countFilled,
  createEmptyInventory,
  findDuplicateBlocks,
  letterFrequency,
  validateInventory,
} from "../src/model.js";

const letter = (ch) => ({ kind: "letter", ch });
const symbol = (symbol) => ({ kind: "symbol", symbol });

function fixture() {
  const inv = createEmptyInventory();
  inv.blocks[0].faces = [letter("M"), letter("E"), letter("R"), symbol("tree")];
  inv.blocks[1].faces = [letter("R"), letter("Y"), letter("A"), letter("B")];
  return inv;
}

test("empty inventory has 64 unfilled faces and is structurally valid", () => {
  const inv = createEmptyInventory();
  assert.equal(inv.blocks.length, 16);
  assert.equal(countFilled(inv), 0);
  assert.equal(validateInventory(inv).ok, true);
});

test("countFilled counts filled faces only", () => {
  assert.equal(countFilled(fixture()), 8);
});

test("validateInventory rejects bad version, counts and faces", () => {
  const inv = fixture();
  assert.equal(validateInventory({ ...inv, version: 2 }).ok, false);
  assert.equal(validateInventory({ ...inv, blocks: inv.blocks.slice(0, 15) }).ok, false);
  const bad = fixture();
  bad.blocks[2].faces[0] = { kind: "letter", ch: "ab" };
  assert.equal(validateInventory(bad).ok, false);
  const badSymbol = fixture();
  badSymbol.blocks[2].faces[0] = { kind: "symbol", symbol: "unicorn" };
  assert.equal(validateInventory(badSymbol).ok, false);
});

test("letterFrequency counts only letter faces", () => {
  const freq = letterFrequency(fixture());
  assert.equal(freq.get("R"), 2);
  assert.equal(freq.get("M"), 1);
  assert.equal(freq.get("tree"), undefined);
});

test("findDuplicateBlocks flags blocks with identical face multisets", () => {
  const inv = createEmptyInventory();
  inv.blocks[0].faces = [letter("A"), letter("B"), letter("C"), letter("D")];
  inv.blocks[1].faces = [letter("D"), letter("C"), letter("B"), letter("A")];
  inv.blocks[2].faces = [letter("A"), letter("B"), letter("C"), symbol("heart")];
  assert.deepEqual(findDuplicateBlocks(inv), [[1, 2]]);
});
