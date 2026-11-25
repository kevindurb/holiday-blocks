// Data model for the block inventory.
//
// A face is either null (unfilled), { kind: "letter", ch: "A" }, or
// { kind: "symbol", symbol: "tree" }. An inventory is
// { version: 1, blocks: [{ n: 1..16, faces: [face x4] }] }.

export const SYMBOLS = Object.freeze([
  "flowers",
  "shamrock",
  "tree",
  "heart",
  "four",
  "pineapple",
  "usa",
]);

export const SYMBOL_GLYPHS = Object.freeze({
  flowers: "\u{1F338}",
  shamrock: "☘️",
  tree: "\u{1F384}",
  heart: "❤️",
  four: "4",
  pineapple: "\u{1F34D}",
  usa: "\u{1F1FA}\u{1F1F8}",
});

export const SYMBOL_NAMES = Object.freeze({
  flowers: "Flowers",
  shamrock: "Shamrock",
  tree: "Tree",
  heart: "Heart",
  four: "4",
  pineapple: "Pineapple",
  usa: "USA flag",
});

export const INVENTORY_VERSION = 1;
export const BLOCK_COUNT = 16;
export const FACES_PER_BLOCK = 4;
export const FACE_COUNT = BLOCK_COUNT * FACES_PER_BLOCK;

export function glyphFor(face) {
  if (!face) return "";
  if (face.kind === "letter") return face.ch;
  return SYMBOL_GLYPHS[face.symbol] ?? "?";
}

export function createEmptyInventory() {
  const blocks = [];
  for (let n = 1; n <= BLOCK_COUNT; n += 1) {
    blocks.push({ n, faces: [null, null, null, null] });
  }
  return { version: INVENTORY_VERSION, blocks };
}

export function isValidFace(face) {
  if (face === null) return true;
  if (typeof face !== "object") return false;
  if (face.kind === "letter") {
    return typeof face.ch === "string" && /^[A-Z]$/.test(face.ch);
  }
  if (face.kind === "symbol") {
    return SYMBOLS.includes(face.symbol);
  }
  return false;
}

export function validateInventory(inv) {
  const errors = [];
  if (!inv || typeof inv !== "object") {
    return { ok: false, errors: ["inventory is not an object"] };
  }
  if (inv.version !== INVENTORY_VERSION) {
    errors.push(`unsupported version: ${String(inv.version)}`);
  }
  if (!Array.isArray(inv.blocks) || inv.blocks.length !== BLOCK_COUNT) {
    errors.push(`expected ${BLOCK_COUNT} blocks`);
    return { ok: false, errors };
  }
  const seen = new Set();
  for (const block of inv.blocks) {
    if (!block || typeof block !== "object") {
      errors.push("block is not an object");
      continue;
    }
    if (!Number.isInteger(block.n) || block.n < 1 || block.n > BLOCK_COUNT) {
      errors.push(`invalid block number: ${String(block.n)}`);
    } else if (seen.has(block.n)) {
      errors.push(`duplicate block number: ${block.n}`);
    } else {
      seen.add(block.n);
    }
    if (!Array.isArray(block.faces) || block.faces.length !== FACES_PER_BLOCK) {
      errors.push(`block ${block?.n}: expected ${FACES_PER_BLOCK} faces`);
      continue;
    }
    block.faces.forEach((face, i) => {
      if (!isValidFace(face)) {
        errors.push(`block ${block.n} face ${i + 1}: invalid face`);
      }
    });
  }
  return { ok: errors.length === 0, errors };
}

export function countFilled(inventory) {
  let filled = 0;
  for (const block of inventory.blocks) {
    for (const face of block.faces) {
      if (face) filled += 1;
    }
  }
  return filled;
}

export function letterFrequency(inventory) {
  const freq = new Map();
  for (const block of inventory.blocks) {
    for (const face of block.faces) {
      if (face?.kind === "letter") {
        freq.set(face.ch, (freq.get(face.ch) ?? 0) + 1);
      }
    }
  }
  return freq;
}

function faceSignature(face) {
  if (!face) return "empty";
  return face.kind === "letter" ? `L:${face.ch}` : `S:${face.symbol}`;
}

export function findDuplicateBlocks(inventory) {
  const bySignature = new Map();
  for (const block of inventory.blocks) {
    if (!block.faces.some((face) => face !== null)) continue;
    const sig = block.faces.map(faceSignature).sort().join("|");
    if (!bySignature.has(sig)) bySignature.set(sig, []);
    bySignature.get(sig).push(block.n);
  }
  return [...bySignature.values()].filter((group) => group.length > 1);
}
