# Proposal

## Why

The family owns a physical set of 16 large "holiday blocks" — four-sided cubes
numbered 1–16 on the bottom, with a letter or a topical symbol on most faces
(flowers, shamrock, tree, heart, "4", pineapple, USA flag). Laying them out to
invent holiday messages by hand is slow and error-prone: you cannot see at a
glance which phrases the set can spell, or which faces go where. There is no
record of what is on each face, and no tool to answer "what can these blocks
spell?" This change creates that tool: a small static web app that records the
blocks and computes what they can spell.

## What Changes

- New static web app, vanilla HTML/CSS/ES modules, no framework and no build
  step, deployed to GitHub Pages via GitHub Actions.
- Block inventory editor: record all 16 blocks and their 4 faces each (letter
  or one of the known symbols). Persisted in the browser (localStorage), with
  JSON export/import for backup and moving between devices.
- Spell checker: enter a phrase, get every way to lay it out with the real
  blocks — which block goes in which position and which face to show.
- Phrase enumerator: search a bundled open dictionary for every word and
  multi-word phrase (capped at 4 words / 16 blocks) the set can spell, ranked
  by word frequency, with symbols usable as single-token words displayed as
  their glyphs (e.g. `MERRY 🎄`).
- Symbols are display tokens only; they are never expanded to words
  ("tree" does not become "CHRISTMAS").
- Blocks are used at most once per phrase; the number of rows (one or two
  stacked) does not affect results.

## Capabilities

### New Capabilities

- `block-inventory`: Recording, editing, persisting, and sharing the 16-block
  face inventory (data model, editor UI, localStorage persistence, JSON
  export/import).
- `phrase-discovery`: Solving a given phrase against the inventory (all block
  assignments) and enumerating all spellable words/phrases from a bundled
  dictionary, with symbols as literal single-token words and per-block-once
  reuse rules.

### Modified Capabilities

None — this is the first application code in the repository.

## Impact

- New application source tree at the repo root (static site), a GitHub Actions
  workflow deploying to GitHub Pages, and a bundled word list asset.
- `openspec/config.yaml` `context:` block is still the template TODO and will
  need real content as part of this change (project purpose, stack, commands).
- `justfile` stubs (`fmt`, `lint`, `build`, `test`) and `AGENTS.md` need to
  reflect the app's real checks once it exists.
- No servers, accounts, or external services; fully client-side. No secrets.
