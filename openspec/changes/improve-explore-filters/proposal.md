# Proposal

## Why

The Explore tab enumerates every spellable word and phrase, but its only
narrowing controls are three coarse chips (All / Phrases / Single words). A
typical result set is dominated by low-value short single words, so the list
is noisy and hard to scan, and there is no way to home in on phrases worth
laying out. The user-facing result is an Explore page that does not pay off
the enumeration work behind it.

## What Changes

- Replace the All / Phrases / Single words chip row with a filter toolbar for
  the already-loaded results:
  - Minimum number of words in the result (e.g. 1+, 2+, 3+, ...)
  - Minimum letters per word (per token, letters only; symbols don't count)
  - Minimum total letters across the phrase
  - Symbol inclusion mode: any / includes a symbol / excludes symbols
  - Free-text search on the result text (case-insensitive substring)
  - A "clear filters" action that restores defaults
- Ship a stronger default than the old "All" view: minimum letters per word
  defaults to 3 so one- and two-letter junk singles (A, I, AT, OF, ...) are
  hidden until the user opts back in. The default view stays a single click
  away from showing everything.
- Show a live "Showing X of Y" count and a useful empty state with a
  one-click "Clear filters" when nothing matches.
- Keep filtering entirely client-side, applied to the loaded result set: no
  changes to the worker, enumerator, ranking, or enumeration caps.
- Small usability pass around the same area: consistent control labels,
  keyboard/screen-reader friendliness, and result-row details kept intact.

Non-goals (explicitly out of scope):

- No changes to search/ranking quality, scoring, beam width, the word list,
  or `maxPhrases`. "Noisy" is addressed by filtering and better defaults, not
  by re-ranking.
- No persistence of filter state across sessions.
- No server or storage changes; everything stays in the browser.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `phrase-discovery`: the result-presentation requirements for the Explore
  view gain filtering behavior — a filter toolbar with the controls above,
  a stronger default view, live result counts, and a clear-filters recovery
  path. Enumeration behavior itself is unchanged. (Note: the `phrase-discovery`
  spec is currently introduced by the pending `add-holiday-blocks-app` change;
  this delta adds requirements to that same capability.)

## Impact

- `index.html` — replace the `#explore-filters` chip row with the toolbar markup.
- `src/ui/explore.js` — filter state, matching, rendering, counts, empty states.
- Likely a small pure module (e.g. `src/explore-filters.js`) so the matching
  logic is unit-testable under `node --test`.
- `styles.css` — toolbar layout and control styles.
- `test/` — unit tests for the filter matcher.
- No changes to `src/enumerate.js`, `src/worker.js`, the word list, or storage.
