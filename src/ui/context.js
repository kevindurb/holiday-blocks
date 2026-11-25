// Shared app context: owns the inventory, persistence, and view refresh.
import { createEmptyInventory, validateInventory } from "../model.js";
import { loadInventory, saveInventory } from "../store.js";

export function createAppContext() {
  let inventory = loadInitial();
  const listeners = new Set();

  function loadInitial() {
    const { inventory: stored, error } = loadInventory(window.localStorage);
    if (error || !stored) return createEmptyInventory();
    const { ok } = validateInventory(stored);
    return ok ? stored : createEmptyInventory();
  }

  return {
    getInventory: () => inventory,
    setInventory(next) {
      inventory = next;
      saveInventory(window.localStorage, next);
      for (const listener of listeners) listener(inventory);
    },
    onChange(listener) {
      listeners.add(listener);
      listener(inventory);
    },
  };
}
