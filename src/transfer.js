// JSON export/import of the inventory. Export is a plain download of the
// inventory document; import validates strictly and never touches current
// state until the caller confirms and applies the returned inventory.

import { validateInventory } from "./model.js";

export function serializeInventory(inventory) {
  return JSON.stringify(
    { app: "holiday-blocks", exportedAt: new Date().toISOString(), ...inventory },
    null,
    2,
  );
}

export function exportFilename(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  return `holiday-blocks-inventory-${stamp}.json`;
}

export function parseImport(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["not valid JSON"] };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, errors: ["expected a JSON object"] };
  }
  const { version, blocks } = parsed;
  const candidate = { version, blocks };
  const { ok, errors } = validateInventory(candidate);
  if (!ok) return { ok: false, errors };
  return { ok: true, inventory: candidate };
}
