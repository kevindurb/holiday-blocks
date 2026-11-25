import assert from "node:assert/strict";
import { test } from "node:test";

import { loadInventory, saveInventory, STORAGE_KEY } from "../src/store.js";
import { exportFilename, parseImport, serializeInventory } from "../src/transfer.js";
import { createEmptyInventory } from "../src/model.js";

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test("save then load round-trips the inventory", () => {
  const storage = fakeStorage();
  const inv = createEmptyInventory();
  inv.blocks[0].faces[0] = { kind: "letter", ch: "Q" };
  saveInventory(storage, inv);
  const { inventory, error } = loadInventory(storage);
  assert.equal(error, null);
  assert.equal(inventory.blocks[0].faces[0].ch, "Q");
});

test("corrupt storage falls back to empty without throwing", () => {
  const storage = fakeStorage({ [STORAGE_KEY]: "{not json" });
  const { inventory, error } = loadInventory(storage);
  assert.equal(inventory, null);
  assert.equal(error, "stored inventory is corrupt");
});

test("export/import round-trip preserves the inventory", () => {
  const inv = createEmptyInventory();
  inv.blocks[3].faces[2] = { kind: "symbol", symbol: "pineapple" };
  const text = serializeInventory(inv);
  const parsed = parseImport(text);
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.inventory.blocks, inv.blocks);
});

test("import rejects malformed payloads", () => {
  assert.equal(parseImport("not json").ok, false);
  assert.equal(parseImport('{"version": 99, "blocks": []}').ok, false);
  assert.equal(parseImport("[]").ok, false);
  const invalid = JSON.parse(serializeInventory(createEmptyInventory()));
  invalid.blocks[0].faces[0] = { kind: "letter", ch: "AB" };
  assert.equal(parseImport(JSON.stringify(invalid)).ok, false);
});

test("exportFilename embeds an ISO date", () => {
  assert.match(
    exportFilename(new Date("2026-11-25T12:00:00Z")),
    /^holiday-blocks-inventory-2026-11-25\.json$/,
  );
});
