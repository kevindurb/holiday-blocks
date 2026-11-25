// localStorage persistence for the inventory. Takes a storage-like object
// so tests can inject a fake; the browser passes window.localStorage.

export const STORAGE_KEY = "holiday-blocks.inventory.v1";

export function loadInventory(storage) {
  let raw = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { inventory: null, error: "storage unavailable" };
  }
  if (raw === null) return { inventory: null, error: null };
  try {
    const parsed = JSON.parse(raw);
    return { inventory: parsed, error: null };
  } catch {
    return { inventory: null, error: "stored inventory is corrupt" };
  }
}

export function saveInventory(storage, inventory) {
  storage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}
