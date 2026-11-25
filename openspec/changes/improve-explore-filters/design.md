# Design

## Context

See proposal.md for motivation. The Explore view (`src/ui/explore.js` + `index.html` +
`styles.css`) renders up to `maxPhrases` (default 150) ranked results from the worker
as rows of `{ tokens, text, score, assignments }`. Tokens are
`{ type: "word", value }` and `{ type: "symbol", value }`. All filtering today is a
single `filter` string (`all` / `phrases` / `words`) compared in `matchesFilter`, and
every render re-filters the full array in O(n) — fine at 150 entries.

Constraints: vanilla ES modules, no framework, no build step, no new runtime deps;
logic that is worth unit-testing belongs in an importable `src/*.js` module; DOM stays
thin in `src/ui/explore.js`. The enumerator and worker are out of scope — filters see
whatever the worker already returned.

## Goals / Non-Goals

Goals:
- Declarative filter state applied to the loaded `entries` array in one place.
- Junk-suppressing defaults without hiding anything permanently.
- Testable matcher (`src/explore-filters.js`) with `node --test` coverage.

Non-Goals:
- Re-ranking or rescoring results, worker changes, result persistence, URL/deep-link
  state, saved filter presets.

## Decisions

**Filter state is a plain object, matched by a pure function.**
```js
{ minWords: number, minLettersPerWord: number, minTotalLetters: number,
  symbolMode: "any" | "includes" | "excludes", query: string }
```
`matchesResult(entry, filters)` lives in `src/explore-filters.js` and is unit-tested.
The DOM layer only reads/writes the object and re-renders. Alternative considered:
inline closures in `explore.js` — rejected because the matcher is exactly the logic
that needs tests and the file is imported by node tests, keeping DOM code thin.

Derivations: `wordTokens = entry.tokens.filter(t => t.type === "word")`;
`minWordLength = min word value length` (symbol tokens are exempt per the spec, so a
phrase of only symbols passes `minLettersPerWord` — there is nothing to violate);
`totalLetters = sum of word lengths`; `hasSymbol = tokens.some(t => t.type === "symbol")`;
`query` matches `entry.text` case-insensitively as a substring.

**Defaults: `minWords: 1, minLettersPerWord: 3, minTotalLetters: 1, symbolMode: "any", query: ""`.**
The only behavioral change vs. today beyond the new controls is `minLettersPerWord: 3`,
which suppresses the one/two-letter junk that motivated the change. "Clear filters"
resets to these defaults rather than to "show literally everything", so a panicked
click lands on the curated default view; seeing everything is one control away.
Alternative considered: default `minWords: 2` — rejected as too aggressive; plenty of
good single words (e.g. MERRY, PINEAPPLE) would vanish by default.

**Counts and empty state derive from the same filtered array used to render.**
Render computes `shown = entries.filter(...)` once, writes the rows and a
"Showing X of Y" label from it, and swaps in the empty state (message + "Clear
filters" button) when `shown.length === 0 && entries.length > 0`. X of Y uses the
post-enumeration total, not the worker's pre-cap ranking.

**Controls:** a compact toolbar of native inputs (number inputs / selects / one
search input / one button), wired with `input`/`change` listeners that mutate filter
state and re-render. Words count and totals are bounded by the game (≤4 words, ≤16
blocks) so small `min`/`max` ranges are fine. Native controls keep accessibility
(labels, keyboard) for free and match the app's no-framework style.

**Index stability for expansion:** today the detail pane re-derives the entry via
`entries.filter(matchesFilter)[data-index]`. With richer filters this stays correct
as long as index refers to the same filtered array — capture it once at render time
or stamp the entry index on the row. Either is fine; do not recompute through a
second filter pass with divergent state.

**No worker/protocol changes.** Filters run on the main thread over ≤ ~300 objects;
O(n) per keystroke is negligible. Persisting filter state in localStorage was
considered and rejected (spec: session-scoped only).

## Risks / Trade-offs

- [`minLettersPerWord: 3` default hides legitimate short phrases, not just junk] →
  It trivially clears with one control, the count label shows how many are hidden
  ("Showing 84 of 150"), and the spec calls the default out explicitly.
- [Phrase text search matches glyphs/punctuation oddly for symbol-only results] →
  Search matches only `entry.text` as displayed; documented in the spec as
  case-insensitive substring of the displayed text.
- [Result index drift between render and expansion] → compute the filtered array once
  per render and index into it consistently (see decision above).
- [Design debt: filter state duplicated between defaults and the clear button] →
  single `defaultFilters()` factory in `explore-filters.js` used by both.

## Migration Plan

Static site; deploy is `git push` to main → Pages. No data migration. Rollback is a
revert of the commit; no persisted state exists to clean up.
