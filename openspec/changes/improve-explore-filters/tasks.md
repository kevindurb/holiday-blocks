# Tasks

## 1. Filter matcher module

- [x] 1.1 Create `src/explore-filters.js` exporting a `defaultFilters()` factory (minWords 1, minLettersPerWord 3, minTotalLetters 1, symbolMode "any", query "") and a pure `matchesResult(entry, filters)` implementing word-count, min-letters-per-word (word tokens only), min total letters, symbol mode (any/includes/excludes), and case-insensitive substring search on the result text; verify with a quick `node -e` smoke import
- [x] 1.2 Add unit tests in `test/explore-filters.test.js` covering: each filter in isolation, conjunctive combination, symbol tokens exempt from letter limits, symbol-only results, default `minLettersPerWord: 3` behavior, clear-to-defaults, and search case-insensitivity; verify `just test` passes

## 2. Explore view wiring

- [ ] 2.1 Replace the `#explore-filters` chip row in `index.html` with the filter toolbar (min words, min letters per word, min total letters, symbol mode select, search box, clear-filters button) with proper labels and accessible names; verify the markup renders and controls are keyboard-reachable
- [ ] 2.2 Rework `src/ui/explore.js` to hold filter state, apply `matchesResult` once per render to compute the visible list, render rows from it, and keep the expand/collapse index consistent with the filtered array; verify by expanding rows under an active filter in the browser
- [ ] 2.3 Add the "Showing X of Y" count label and the filtered empty state (message + clear-filters action) alongside the existing results area; verify both appear correctly under active filters in the browser
- [ ] 2.4 Reuse a single `defaultFilters()` for initial state and the clear-filters control; verify pressing clear restores min-letters-per-word to 3 and the default count

## 3. Styling

- [ ] 3.1 Style the toolbar, count label, and empty state in `styles.css` consistent with the existing filter-row look; verify visually in the browser at desktop and narrow widths

## 4. Integration verification

- [ ] 4.1 Run a full enumeration in the browser and verify: default view hides sub-3-letter words, the count label matches, each control narrows the list instantly, clear filters restores the default, and reload resets filters to defaults; verify no console errors
- [x] 4.2 Run `just ci` (fmt + lint + build + test + spec-validate) and fix any failures in the change's files (fix code, not checks); verify it exits clean
