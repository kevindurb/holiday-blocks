// Explore-view result filters: pure predicates over enumerated results.
// Kept DOM-free so node --test can exercise them; the view layer in
// ui/explore.js owns control state and re-rendering.

export function defaultFilters() {
  return {
    minWords: 1,
    minLettersPerWord: 3,
    minTotalLetters: 1,
    symbolMode: "any", // "any" | "includes" | "excludes"
    query: "",
  };
}

function wordTokens(entry) {
  return entry.tokens.filter((token) => token.type === "word");
}

export function matchesResult(entry, filters) {
  const words = wordTokens(entry);

  if (words.length < filters.minWords) return false;
  for (const word of words) {
    if (word.value.length < filters.minLettersPerWord) return false;
  }

  const totalLetters = words.reduce((sum, word) => sum + word.value.length, 0);
  if (totalLetters < filters.minTotalLetters) return false;

  const hasSymbol = entry.tokens.some((token) => token.type === "symbol");
  if (filters.symbolMode === "includes" && !hasSymbol) return false;
  if (filters.symbolMode === "excludes" && hasSymbol) return false;

  const query = filters.query.trim().toLowerCase();
  if (query && !entry.text.toLowerCase().includes(query)) return false;

  return true;
}
