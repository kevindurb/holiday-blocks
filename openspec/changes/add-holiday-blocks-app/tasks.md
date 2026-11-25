# Tasks

## 1. Project scaffolding and checks

- [x] 1.1 Create the static site layout (`index.html`, `site/` or root asset dirs, `src/` ES modules, `test/`) and verify `just build`/`just test` have real targets (e.g. by serving locally and loading the page)
- [x] 1.2 Wire up dev tooling as dev-only npm dependencies (prettier, eslint, node --test) and replace the `justfile` stubs `fmt`/`lint`/`build`/`test` and `ci` with real checks; verify `just ci` passes on the empty scaffold
- [x] 1.3 Update `openspec/config.yaml` `context:` with the real project context (stack, purpose, commands) and refresh `AGENTS.md`'s commands/conventions to match; verify the file reads correctly
- [x] 1.4 Fill in `README.md` for the app (what it is, local dev, deploy) and verify the documented commands run as written

## 2. Data model and inventory persistence

- [x] 2.1 Implement the inventory model module (block/face types, validation, letter frequency, duplicate-block detection) with unit tests; verify tests pass via `just test`
- [x] 2.2 Implement localStorage persistence with the versioned key and load-on-startup; verify with tests (round-trip save/load, corrupt-storage fallback to empty inventory)
- [x] 2.3 Implement JSON export (download) and import (validate, confirm-replace, reject malformed) with unit tests covering valid round-trip and malformed input; verify tests pass

## 3. Block inventory UI

- [x] 3.1 Build the 16×4 inventory editor (letter entry, symbol picker for the 7 symbols, per-face error display); verify by recording a full inventory in a browser and reloading the page
- [x] 3.2 Add inventory summary UI (filled/64 count, letter frequencies, duplicate-block flags, partial-inventory warning); verify against a deliberately partial and a deliberately duplicated inventory

## 4. Solver core

- [x] 4.1 Implement phrase tokenization (letters A–Z, symbol tokens, punctuation/case-insensitive handling, >16 tokens rejected) with unit tests; verify tests pass
- [x] 4.2 Implement the spell-checker backtracking solver (at-most-once block use, case-insensitive face match, symbol match, all-solutions enumeration) with unit tests for empty, unique, multiple, and impossible solutions; verify tests pass
- [x] 4.3 Implement multiset feasibility pre-filter shared by solver and enumerator; verify tests show rejected candidates without running full assignment search

## 5. Spell-it view

- [x] 5.1 Build the spell-checker view (text input + symbol picker, solution listing grouped by phrase with per-solution block/face assignments); verify `MERRY` + tree against a hand-entered inventory in the browser
- [x] 5.2 Verify failure and edge states in the browser: unsolvable phrase shows which tokens cannot be matched, partial inventory shows the warning, >16-token input is rejected

## 6. Enumerator

- [x] 6.1 Add the bundled open wordlist + frequency list assets (license recorded in a NOTICE/LICENSE file) with a loader that normalizes to A–Z; verify asset loads in browser and in node tests
- [x] 6.2 Implement the enumeration beam search in a Web Worker (word tokens + symbol tokens, ≤4 words, ≤16 blocks, frequency ranking, cancel flag, progress messages); verify worker unit tests cover caps, cancellation, and ranking
- [x] 6.3 Build the enumeration results UI (run/cancel, progress indicator, grouped-by-phrase results with expandable assignments, partial-inventory labeling); verify against the real inventory in the browser, including cancelling mid-run

## 7. Deployment

- [x] 7.1 Add the GitHub Actions workflow that runs `just ci` and publishes the site to GitHub Pages on push to `main`; verify the workflow is syntactically valid (actionlint) and pages settings/docs are noted in README
- [ ] 7.2 End-to-end check after merge: site loads on its Pages URL and a full enter-inventory → spell → enumerate cycle works (requires the deploy workflow to have run on `main`; the app itself is verified locally)

## Workflow follow-up

- Archive the change after review, per the repo's OpenSpec workflow.
- Verify the deployed site on its Pages URL after the archive merge.
