// Solver: tokenize phrases and find every block assignment that realizes
// them. Pure logic, no DOM, importable from node tests and the web worker.

import { SYMBOL_GLYPHS } from "./model.js";

export const MAX_TOKENS = 16;
export const DEFAULT_SOLUTION_LIMIT = 1000;

// Glyph -> symbol id. Built from SYMBOL_GLYPHS, longest first so multi-code
// unit glyphs (regional indicators, variation selectors) match before any
// single code unit could.
const GLYPH_TO_SYMBOL = Object.fromEntries(
  Object.entries(SYMBOL_GLYPHS)
    .map(([symbol, glyph]) => [glyph.replace(/\uFE0F/g, ""), symbol])
    .sort((a, b) => b[0].length - a[0].length),
);
const GLYPH_PATTERN = new RegExp(
  Object.keys(GLYPH_TO_SYMBOL)
    .map((g) => g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
);

// Scans the input once, emitting word tokens (A-Z runs) and symbol tokens
// (known glyphs or "4"). Everything else is ignored, per spec.
export function tokenize(input) {
  const tokens = [];
  const text = String(input).toUpperCase();
  const normalized = text.replace(/\uFE0F/g, "");
  let i = 0;
  while (i < normalized.length) {
    const rest = normalized.slice(i);
    const glyphMatch = rest.match(new RegExp(`^(?:${GLYPH_PATTERN.source})`));
    if (glyphMatch) {
      tokens.push({ type: "symbol", value: GLYPH_TO_SYMBOL[glyphMatch[0]] });
      i += glyphMatch[0].length;
      continue;
    }
    const letterMatch = rest.match(/^[A-Z]+/);
    if (letterMatch) {
      tokens.push({ type: "word", value: letterMatch[0] });
      i += letterMatch[0].length;
      continue;
    }
    if (normalized[i] === "4") {
      tokens.push({ type: "symbol", value: "four" });
      i += 1;
      continue;
    }
    i += 1;
  }
  return { tokens, tooLong: tokenCount(tokens) > MAX_TOKENS };
}

function tokenCount(tokens) {
  let count = 0;
  for (const token of tokens) {
    count += token.type === "word" ? token.value.length : 1;
  }
  return count;
}

export function tokenLength(token) {
  return token.type === "word" ? token.value.length : 1;
}

export function phraseText(tokens) {
  return tokens.map((t) => (t.type === "word" ? t.value : SYMBOL_GLYPHS[t.value])).join(" ");
}

// letter counts for each word; symbol faces are separate tokens.
export function letterCounts(tokens) {
  const counts = new Map();
  for (const token of tokens) {
    if (token.type !== "word") continue;
    for (const ch of token.value) {
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
  }
  return counts;
}

export function availableCounts(inventory) {
  const letters = new Map();
  const symbols = new Map();
  for (const block of inventory.blocks) {
    for (const face of block.faces) {
      if (!face) continue;
      if (face.kind === "letter") letters.set(face.ch, (letters.get(face.ch) ?? 0) + 1);
      else symbols.set(face.symbol, (symbols.get(face.symbol) ?? 0) + 1);
    }
  }
  return { letters, symbols };
}

export function canFit(tokens, inventory) {
  const need = letterCounts(tokens);
  const { letters, symbols } = availableCounts(inventory);
  for (const [ch, n] of need) {
    if ((letters.get(ch) ?? 0) < n) return false;
  }
  const symbolNeed = new Map();
  for (const token of tokens) {
    if (token.type === "symbol") {
      symbolNeed.set(token.value, (symbolNeed.get(token.value) ?? 0) + 1);
    }
  }
  for (const [symbol, n] of symbolNeed) {
    if ((symbols.get(symbol) ?? 0) < n) return false;
  }
  return true;
}

// Which tokens cannot be satisfied by the inventory at all, for diagnostics.
export function unmatchedTokens(tokens, inventory) {
  const { letters, symbols } = availableCounts(inventory);
  const short = [];
  const letterPool = new Map(letters);
  const symbolPool = new Map(symbols);
  for (const token of tokens) {
    if (token.type === "symbol") {
      const left = symbolPool.get(token.value) ?? 0;
      if (left <= 0) {
        short.push(token);
      } else {
        symbolPool.set(token.value, left - 1);
      }
    } else {
      let ok = true;
      // Greedy per-token check against the running pool; good enough to name
      // culprits when the phrase as a whole cannot be laid out.
      const needed = new Map();
      for (const ch of token.value) needed.set(ch, (needed.get(ch) ?? 0) + 1);
      for (const [ch, n] of needed) {
        if ((letterPool.get(ch) ?? 0) < n) {
          ok = false;
          break;
        }
      }
      if (!ok) {
        short.push(token);
      } else {
        for (const [ch, n] of needed) letterPool.set(ch, letterPool.get(ch) - n);
      }
    }
  }
  return short;
}

// Backtracking search. Returns { solutions, truncated }.
// Each solution is an array of { tokenIndex, offset, block, face } in phrase
// order; `face` is the exact face object chosen (letter or symbol).
export function solve(inventory, tokens, { limit = DEFAULT_SOLUTION_LIMIT } = {}) {
  const blocks = inventory.blocks;
  const positions = [];
  tokens.forEach((token, tokenIndex) => {
    if (token.type === "word") {
      for (let offset = 0; offset < token.value.length; offset += 1) {
        positions.push({ tokenIndex, offset, ch: token.value[offset] });
      }
    } else {
      positions.push({ tokenIndex, offset: 0, symbol: token.value });
    }
  });

  const solutions = [];
  const used = new Array(blocks.length).fill(false);
  const current = new Array(positions.length);

  // Candidate blocks for each position, precomputed.
  const candidates = positions.map((pos) => {
    const out = [];
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
      const block = blocks[blockIndex];
      for (let faceIndex = 0; faceIndex < block.faces.length; faceIndex += 1) {
        const face = block.faces[faceIndex];
        if (!face) continue;
        const match = pos.ch
          ? face.kind === "letter" && face.ch === pos.ch
          : face.kind === "symbol" && face.symbol === pos.symbol;
        if (match) out.push({ blockIndex, block: block.n, faceIndex, face });
      }
    }
    return out;
  });

  function place(i) {
    if (solutions.length >= limit) return;
    if (i === positions.length) {
      solutions.push(current.map((entry) => ({ ...entry })));
      return;
    }
    const pos = positions[i];
    for (const cand of candidates[i]) {
      if (used[cand.blockIndex]) continue;
      used[cand.blockIndex] = true;
      current[i] = {
        tokenIndex: pos.tokenIndex,
        offset: pos.offset,
        block: cand.block,
        faceIndex: cand.faceIndex,
        face: cand.face,
      };
      place(i + 1);
      used[cand.blockIndex] = false;
      if (solutions.length >= limit) return;
    }
  }

  if (positions.length > 0 && positions.length <= MAX_TOKENS) {
    place(0);
  }
  return { solutions, truncated: solutions.length >= limit };
}

// Count solutions without materializing them; capped. Used by the enumerator.
export function countSolutions(inventory, tokens, { limit = 1000 } = {}) {
  return solve(inventory, tokens, { limit }).solutions.length;
}
