# holiday-blocks

A small static web app for the family's set of 16 "holiday blocks" — the
big wooden cubes, numbered 1–16, with a letter or a topical symbol (tree,
shamrock, heart, pineapple, USA flag, …) on each face.

Record what is on each face, then find out what the set can spell:

- **Blocks** — enter every face (letters A–Z and symbols), stored in the
  browser (`localStorage`). Export/import JSON to back up or move devices.
- **Spell it** — type a phrase (e.g. `MERRY 🎄`) and see every way to lay it
  out with real blocks, one block per position.
- **Explore** — enumerate every word and multi-word phrase the set can spell
  (up to 4 words / 16 blocks), ranked by word frequency, computed in a Web
  Worker. Symbols act as single tokens displayed as glyphs.

Rules of the game: each physical block can be used at most once per phrase;
rows (one row or two stacked) don't matter.

## Stack

Vanilla HTML/CSS/ES modules. No framework, no bundler, no runtime
dependencies. `node` is only used for checks and unit tests (via `node --test`).
Deployed to GitHub Pages by `.github/workflows/deploy-pages.yml` on push to
`main`.

## Develop

```sh
just            # list recipes
just ci         # what CI runs: fmt + lint + build + test + spec-validate
just test       # node --test
just fmt        # prettier --check (check only; won't rewrite)
just lint       # eslint
just build      # asset/wordlist sanity checks (there is no compile step)
```

Serve locally with any static file server, e.g.:

```sh
python3 -m http.server 8000
# open http://127.0.0.1:8000
```

## Deploy

Push to `main`. The deploy workflow runs `just ci`, bundles `index.html`,
`styles.css`, `src/`, and `assets/`, and publishes them to GitHub Pages.
One-time setup: in the repo settings, set **Pages → Build and deployment →
Source: GitHub Actions**.

## Word list

`assets/words.txt` is derived from SCOWL 2020.12.07 (English, sizes 10–50,
lowercase A–Z, ≥2 letters), one `word tier` pair per line; lower tier = more
common. See `NOTICE.md` and `assets/SCOWL-COPYRIGHT.txt` for attribution.
Rebuild by re-deriving from the SCOWL distribution and re-running
`just build`.

## Project layout

| Path                       | What                                                        |
| -------------------------- | ----------------------------------------------------------- |
| `index.html`, `styles.css` | the site (single page, three tabs)                          |
| `src/model.js`             | inventory schema, validation, stats                         |
| `src/solver.js`            | phrase tokenizer + backtracking solver                      |
| `src/enumerate.js`         | beam-search phrase enumerator                               |
| `src/worker.js`            | Web Worker wrapper for the enumerator                       |
| `src/ui/`                  | DOM views (inventory, spell, explore)                       |
| `assets/`                  | word list + SCOWL copyright                                 |
| `test/`                    | `node --test` suites for model, solver, enumerator, storage |

## History

This repo started from the `base` template, which carries a GitHub-native
OpenSpec factory (issue → proposal PR → implementation PR → archive PR). See
`docs/factory.md` for that workflow; feature changes go through it.
