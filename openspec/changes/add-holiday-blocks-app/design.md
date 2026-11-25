# Design

## Context

Greenfield static web app in the `holiday-blocks` repo (currently the empty
`base` template). See proposal.md for motivation. The app must run fully
client-side from GitHub Pages: no backend, no accounts, no build-time
secrets. The two hard problems are (1) the search (spelling and enumerating
against 16 blocks worth of faces) and (2) keeping a no-build vanilla stack
maintainable as it grows.

## Goals / Non-Goals

**Goals:**
- Single static site deployable to GitHub Pages from `main` via GitHub Actions.
- Solver correct and fast enough to run on a phone; UI never freezes.
- Inventory is the single source of truth; solving and enumeration both derive
  from it, so the app is data-entered once and reused.

**Non-Goals:**
- Accounts, sync services, or any server-side component.
- Expanding symbols into words (symbols are literal tokens).
- Guaranteeing "sensible" phrase output — enumeration accepts dictionary
  noise, mitigated by ranking, not by curation.
- Audio, animation, or any physical-integration features.

## Decisions

### Vanilla ES modules, no framework, no bundler
Plain HTML + CSS + ES modules served as static files. Alternatives: a
framework + Vite (React/Svelte) — rejected: the UI is three simple views
(inventory editor, spell checker, enumerator) and a dependency/build chain
adds maintenance for zero user benefit. Tooling (linter, formatter, tests)
uses dev-only npm dependencies; nothing is bundled into the deployed site.

### Repo layout
`index.html` and `assets/` at repo root (or a `site/` directory published
wholesale); `src/` for ES modules (`model.js`, `solver.js`, `enumerate.js`,
`storage.js`, `ui/`); `wordlist/` for the bundled dictionary + frequency
data; `test/` for node:test suites. GitHub Pages serves the site directory;
a workflow copies or publishes it on push to `main`.

### Data model and persistence
Inventory is one JSON document: `{ version: 1, blocks: [{ n: 1..16, faces:
[face, face, face, face] }, ...] }` where a face is `{ kind: "letter", ch:
"A" }` or `{ kind: "symbol", symbol: "tree" }`. Stored in `localStorage`
under a versioned key; export/import round-trips the same document with a
`version` field so future schema changes can migrate. Import validates
strictly (16 blocks, 4 faces, known kinds) and replaces only after explicit
confirmation. Alternative considered: embedding the inventory in the repo —
rejected; it is family data, entered through the UI, and belongs on the
devices, not in git.

### Symbols and phrase tokens
A phrase is a sequence of tokens; each token is a word (letters) or a symbol
(one of `flowers | shamrock | tree | heart | four | pineapple | usa`).
Symbols match exactly one face each and are displayed as glyphs. The "4"
face matches digit `4` only — not the word FOUR — keeping matching
unambiguous. The input UI provides a symbol picker next to the text field so
the user never types symbol names by hand. Alternative considered: mapping
symbols to candidate words — rejected (see proposal; the family reads them
topically, and expansion would multiply false positives).

### Solver: multiset pre-filter plus exact block matching
- Feasibility check: a per-state multiset letter-count check rejects most
  word candidates cheaply; survivors go through an exact block-distinctness
  check (bipartite matching of the word's letters onto unused blocks — a
  block shows one face, so letter counts alone are not sufficient). Only
  then is a candidate added to the search frontier.
- Spell checker: backtracking assignment, block per position, at-most-once
  reuse, faces matched case-insensitively. 16 positions max — trivially fast.
- Enumerator: beam search by depth (~400 partial phrases kept per level)
  with a per-level best-first ordering; each level explores every remaining
  branch, so memory stays flat and common words surface first. Results are
  kept in two buckets — single-token results and multi-token phrases — so
  one-word answers cannot crowd out phrases; each bucket is capped at
  maxPhrases and ranked by summed SCOWL tier plus a small per-block term.
  Hard caps: 4 words, 16 blocks. Runs in a Web Worker with progress
  callbacks and a cancel flag; cancellation returns partial results.
- Alternative considered: DFS enumeration — replaced by beam search after
  profiling showed alphabetical branch explosion; a SAT/exact-cover solver
  library was rejected as an unnecessary dependency for a ≤16-slot problem.

### Wordlist
Bundle the SCOWL English word list (sizes ≤ 50, A–Z only, committed as a
static asset with its copyright file and `NOTICE.md` attribution). Each
word carries its smallest SCOWL size as a rough frequency tier (10 = most
common); no separate frequency corpus is bundled. Apostrophes and
punctuation are dropped; matching is on A–Z only. Common-word junk is
tolerated per the proposal; ranking is the mitigation, not filtering.

### Testing and checks
Pure logic (model validation, solver, enumerator, import/export) lives in
modules importable by `node --test`; DOM code stays thin. `just` recipes:
`fmt` (prettier --check), `lint` (eslint), `test` (node --test), `build`
(wordlist/asset sanity check — there is no compile), `ci` = all of the
above + `spec-validate`. The template's stub `ci` is replaced.

### Deployment
GitHub Actions workflow on push to `main`: run `just ci`, then publish the
site directory to Pages. No secrets; uses the standard Pages actions.

## Risks / Trade-offs

- [Enumeration can still produce large junky result sets] → frequency
  ranking, 4-word/16-block caps, results grouped by phrase with expandable
  assignments; a curated holiday list can be added later without spec changes.
- [localStorage is per-browser] → JSON export/import is first-class; missing
  data on a new device is recoverable, not catastrophic.
- [Face data-entry errors (64 faces by hand)] → live completeness counter,
  duplicate-block flags, letter-frequency summary; export after first entry.
- [Wordlist quality/licensing] → use a permissively licensed list and record
  it in a LICENSE/NOTICE file with the asset.
- [Web Worker complexity] → keep the worker boundary at one message type
  (progress + results); all logic in importable modules so tests never
  touch the worker.
- [two-row display] → rows carry no meaning, so the UI renders wrapped flow,
  never a strict grid, avoiding false positional semantics.

## Open Questions

- Whether to ship a seed inventory JSON in the repo as a starting point, or
  leave every device to enter faces manually. Deferrable; specs don't depend
  on it.
