// Phrase enumeration: beam search over token sequences spellable from an
// inventory. Pure logic, no DOM; runs inside a Web Worker in the app and
// directly in node tests.
//
// Feasibility is exact, not count-based: a word is only a candidate if its
// letters can be assigned distinct physical blocks (a block shows one face).

import { phraseText, countSolutions } from "./solver.js";

export const MAX_WORDS = 4;
export const MAX_BLOCKS = 16;
export const DEFAULT_MAX_PHRASES = 200;
export const DEFAULT_NODE_BUDGET = 2_000_000;
export const BEAM_WIDTH = 400;

const A = "a".charCodeAt(0);

// Binary max-heap keyed on `score`, fixed capacity. Losers of a full heap
// are rejected before paying for a state allocation.
function makeBeam(capacity) {
  const items = [];
  const swap = (i, j) => ([items[i], items[j]] = [items[j], items[i]]);
  const siftUp = (i) => {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[i].score > items[parent].score) {
        swap(i, parent);
        i = parent;
      } else break;
    }
  };
  const siftDown = (i) => {
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let largest = i;
      if (left < items.length && items[left].score > items[largest].score) largest = left;
      if (right < items.length && items[right].score > items[largest].score) largest = right;
      if (largest === i) break;
      swap(i, largest);
      i = largest;
    }
  };
  return {
    size: () => items.length,
    worst: () => (items.length < capacity ? Infinity : items[0].score),
    push(item) {
      if (items.length < capacity) {
        items.push(item);
        siftUp(items.length - 1);
      } else if (item.score < items[0].score) {
        items[0] = item;
        siftDown(0);
      }
    },
    toArray: () => items,
  };
}

// Build the scan table from [{ w, tier }]: one entry per word with its
// distinct-letter (index, count) pairs plus its letter index list.
export function buildWordTable(words) {
  const table = [];
  for (const { w, tier } of words) {
    const counts = new Int16Array(26);
    const letters = [];
    for (let i = 0; i < w.length; i += 1) {
      const idx = w.charCodeAt(i) - A;
      counts[idx] += 1;
      letters.push(idx);
    }
    const pairs = [];
    for (let i = 0; i < 26; i += 1) {
      if (counts[i] > 0) pairs.push(i, counts[i]);
    }
    table.push({ word: w.toUpperCase(), tier, length: w.length, pairs, letters });
  }
  table.sort((a, b) => a.tier - b.tier || a.length - b.length || (a.word < b.word ? -1 : 1));
  return table;
}

// Per-inventory block availability, indexed by letter/symbol.
export function buildBlockIndex(inventory) {
  const letterBlocks = Array.from({ length: 26 }, () => []);
  const symbolBlocks = new Map();
  inventory.blocks.forEach((block, index) => {
    for (const face of block.faces) {
      if (!face) continue;
      if (face.kind === "letter") {
        letterBlocks[face.ch.toUpperCase().charCodeAt(0) - 65].push(index);
      } else if (!symbolBlocks.has(face.symbol)) {
        symbolBlocks.set(face.symbol, [index]);
      } else {
        symbolBlocks.get(face.symbol).push(index);
      }
    }
  });
  return { letterBlocks, symbolBlocks };
}

// Try to assign a distinct unused block to each letter of `entry`.
// `usedMask` has bit i set when block i is already used. Returns the new
// mask on success, or -1 when no assignment exists. Positions are matched
// rarest-letter-first to keep the search small.
function matchWord(entry, letterBlocks, usedMask) {
  const positions = entry.letters.map((_, i) => i);
  positions.sort(
    (a, b) => letterBlocks[entry.letters[a]].length - letterBlocks[entry.letters[b]].length,
  );
  let mask = usedMask;
  const assign = new Array(positions.length);
  function place(k) {
    if (k === positions.length) return true;
    const li = entry.letters[positions[k]];
    for (const blockIndex of letterBlocks[li]) {
      const bit = 1 << blockIndex;
      if (mask & bit) continue;
      mask |= bit;
      assign[positions[k]] = blockIndex;
      if (place(k + 1)) return true;
      mask ^= bit;
    }
    return false;
  }
  return place(0) ? mask : -1;
}

export function enumerate({
  inventory,
  wordTable,
  maxPhrases = DEFAULT_MAX_PHRASES,
  nodeBudget = DEFAULT_NODE_BUDGET,
  shouldCancel = () => false,
  onProgress = null,
}) {
  const { letterBlocks, symbolBlocks } = buildBlockIndex(inventory);

  const remaining = new Int16Array(26);
  let totalLetters = 0;
  for (const block of inventory.blocks) {
    for (const face of block.faces) {
      if (face?.kind === "letter") remaining[face.ch.toUpperCase().charCodeAt(0) - 65] += 1;
    }
  }
  for (const n of remaining) totalLetters += n;

  // Drop words the inventory can never spell; shrinks every later scan.
  const table = wordTable.filter((entry) => {
    for (let i = 0; i < entry.pairs.length; i += 2) {
      if (remaining[entry.pairs[i]] < entry.pairs[i + 1]) return false;
    }
    return true;
  });

  const symbolList = [...symbolBlocks.keys()];

  let nodes = 0;
  let truncated = false;
  const singles = [];
  const multis = [];

  const pushTo = (bucket, record) => {
    bucket.push(record);
    if (bucket.length > maxPhrases * 2) {
      bucket.sort((a, b) => a.score - b.score);
      bucket.length = maxPhrases;
    }
  };

  function consider(state) {
    const record = {
      tokens: state.tokens,
      text: phraseText(state.tokens),
      score: state.score,
    };
    pushTo(state.tokens.length >= 2 ? multis : singles, record);
  }

  // Beam search by depth: each level keeps the BEAM_WIDTH best-scoring
  // partial phrases, so every branch is considered and memory stays flat.
  let beam = [
    {
      tokens: [],
      remaining: remaining.slice(),
      usedMask: 0,
      lettersLeft: totalLetters,
      wordCount: 0,
      blocksUsed: 0,
      score: 0,
    },
  ];

  while (beam.length > 0 && !truncated) {
    const next = makeBeam(BEAM_WIDTH);
    for (const state of beam) {
      if (shouldCancel()) {
        truncated = true;
        break;
      }
      nodes += 1;
      if (nodes > nodeBudget) {
        truncated = true;
        break;
      }
      if (onProgress && nodes % 100 === 0) {
        onProgress({ nodes, found: singles.length + multis.length });
      }

      if (state.wordCount > 0) {
        consider(state);
      }
      if (state.wordCount >= MAX_WORDS || state.blocksUsed >= MAX_BLOCKS) continue;

      // Branch 1: next token is a word spellable with distinct blocks.
      const worst = next.worst();
      for (const entry of table) {
        if (entry.length > state.lettersLeft) continue;
        const baseScore = state.score + entry.tier + entry.length * 0.1;
        if (baseScore >= worst) continue; // cannot crack the beam
        const pairs = entry.pairs;
        let countsOk = true;
        for (let i = 0; i < pairs.length; i += 2) {
          if (state.remaining[pairs[i]] < pairs[i + 1]) {
            countsOk = false;
            break;
          }
        }
        if (!countsOk) continue;
        const newMask = matchWord(entry, letterBlocks, state.usedMask);
        if (newMask === -1) continue;
        const nextRemaining = Int16Array.from(state.remaining);
        for (let i = 0; i < pairs.length; i += 2) {
          nextRemaining[pairs[i]] -= pairs[i + 1];
        }
        next.push({
          tokens: [...state.tokens, { type: "word", value: entry.word }],
          remaining: nextRemaining,
          usedMask: newMask,
          lettersLeft: state.lettersLeft - entry.length,
          wordCount: state.wordCount + 1,
          blocksUsed: state.blocksUsed + entry.length,
          score: baseScore,
        });
      }

      // Branch 2: next token is a symbol on an unused block.
      for (const symbol of symbolList) {
        const symbolBlockList = symbolBlocks.get(symbol);
        let placedBlock = -1;
        for (const blockIndex of symbolBlockList) {
          if ((state.usedMask & (1 << blockIndex)) === 0) {
            placedBlock = blockIndex;
            break;
          }
        }
        if (placedBlock === -1) continue;
        next.push({
          tokens: [...state.tokens, { type: "symbol", value: symbol }],
          remaining: state.remaining,
          usedMask: state.usedMask | (1 << placedBlock),
          lettersLeft: state.lettersLeft,
          wordCount: state.wordCount,
          blocksUsed: state.blocksUsed + 1,
          score: state.score + 0.1,
        });
      }
    }

    beam = next.toArray();
  }

  for (const bucket of [singles, multis]) {
    bucket.sort((a, b) => a.score - b.score);
    bucket.length = Math.min(bucket.length, maxPhrases);
  }
  return {
    results: [...singles, ...multis].sort((a, b) => a.score - b.score),
    nodes,
    truncated,
  };
}

export function withAssignmentCounts(inventory, results, { limit = 1000 } = {}) {
  return results.map((entry) => ({
    ...entry,
    assignments: countSolutions(inventory, entry.tokens, { limit }),
  }));
}

// Parse the bundled "word tier" lines.
export function parseWordlist(text) {
  const words = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const space = trimmed.lastIndexOf(" ");
    const word = trimmed.slice(0, space);
    const tier = Number(trimmed.slice(space + 1));
    if (word && Number.isFinite(tier)) words.push({ w: word, tier });
  }
  return words;
}
