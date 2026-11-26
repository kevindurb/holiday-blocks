# Design

## Context

See proposal.md for the measured defect (multi-word results are always
single-word + symbol combos; zero genuine phrases). Relevant implementation
facts (verified against `src/enumerate.js`):

- Beam width 400 per depth; each result carries `tokens`, `score`, `text`.
- Two buckets in `consider()`: `state.tokens.length >= 2` → "multi" bucket, else
  "singles". Each bucket is capped at 150 (`maxPhrases`), trimmed mid-run at
  2× cap. Both are merged and sorted by ascending score for output.
- Score: `state.score + entry.tier + entry.length * 0.1` per word; symbols add
  0.1. Lower is better; tiers are 10/20/35/40/50.
- The worker calls `enumerate({ inventory, wordTable, maxPhrases: 150 })`; the
  UI passes the filter criteria (including min word count) after the fact.

## Goals / Non-Goals

Goals:
- After this change, the multi-word bucket contains genuine multi-word phrases.
- Ranking prefers phrases/words that use more blocks at equal frequency tier.
Goals excluded:
- No change to beam width, caps, node budget, or the word list.
- No UI changes (the `improve-explore-filters` toolbar already exposes
  min-words / min-letters; those become useful once phrases exist).
- No attempt at grammatical phrase quality beyond frequency × length.

## Decisions

**1. Bucket by word count, not token count.**
`consider()` classifies by the number of word tokens, not total tokens. A
one-word + N-symbol result ranks with the singles; two or more words ranks as
a phrase. Alternative considered: keep token-count bucketing and only reprice
symbols — rejected, because any near-free word remains beatable by symbol
stacking regardless of weight, and a phrase is defined by having words.

**2. Score `tier − 0.5 × wordLength` per word; symbols are costed and capped.**
Length contributes −0.5 per letter: at equal tier, longer words win
(e.g. tier-10 `QUICKLY` (7) = 6.5 vs `IF` (2) = 9.0). Tier dominance is
preserved: one tier step (10) exceeds the maximum length effect any realistic
span of lengths can produce within a pair comparison (the gap between two
words is at most ~16 letters ≈ 8 points < 10), so ordering between tiers
never flips. Symbol tokens cost a fixed ~10 (comparable to a common short
word) and a phrase may carry at most one — see Decision 5; "symbols free"
was measured to annihilate genuine multi-word phrases when 7 symbol faces
are present.
Alternatives considered:
- `tier + 0.1·len` (original): short-word bias — rejected (the bug itself).
- Symbols free (+0.1), as originally deployed in this change: on the real
  7-symbol inventory this produced zero genuine two-word phrases in the
  150-entry multi-word bucket — the beam fills with symbol continuations.
  Rejected after measurement.
- Symbol cost ~5: phrases appear but symbol-decorated long words still ride
  near the top; also measured. Partially works, still noisy.
- Symbol cost ~25+: symbols vanish from results almost entirely.
- Per-block credit on symbols as well: maximal-block symbol stuffing
  ("QUICKLY 🎄 SO"); rejected by measurement.

**3. Singles reweighted too.**
Uniform rule, no special cases: a single formula for all words. Side effect:
top singles become long tier-10 words (e.g. PROVIDES, SUBJECTS) instead of
THE/OF/AND. Consciously accepted; the frequency tier still orders across
tiers, and `improve-explore-filters` gives users the min/max levers if they
prefer short words.

**4. Implementation is a handful of surgical edits in `src/enumerate.js`.**
Named constants `WORD_LENGTH_WEIGHT` (0.5), `SYMBOL_COST` (10),
`MAX_SYMBOLS_PER_PHRASE` (1); one-line score changes in the word and symbol
branches; the word-count predicate in `consider()`; a guard against adding a
second symbol to a state that already holds one. No signature changes; worker
and UI untouched.

**5. Cap one symbol per phrase.**
Even with a ~10-point cost, capping symbols at one per phrase bounds the
"free decoration" surface and guarantees symbol branching cannot monopolize
the beam at any depth. Phrase semantics stay simple: a phrase is words plus
optionally one glyph. Cost and cap were validated together against the real
inventory: 150/150 two-word phrases in the multi bucket, clean output,
runtime unchanged at ~2s.

## Verification plan

Unit tests with tiny synthetic inventories/word tables asserting:
(a) a one-word+symbol result is classified single; (b) two words classify as
multi; (c) at equal tier a longer word ranks first; (d) tier dominates length;
(e) multi bucket contains genuine phrases with a word list crafted so that all
top results pre-fix are symbol combos. Plus a manual run of the real app on
the deployed site (this project's established verification path).

## Risks / Trade-offs

- [Symbol cost ~10 makes multi-word phrases dominate and shrinks symbol-only
  appearances] → Intended trade-off per measurement; if real-world output
  feels too clean, dropping `SYMBOL_COST` toward ~5 or raising the cap is a
  one-line change with existing tests to catch regressions.
- [Long-word bias makes "THE QUICK" style short phrases rank lower] → That is
  the requested behavior; min-words/min-letters filters give the user control.
- [Bucket reclassification reshuffles everything shown in Explore] → Expected;
  the previous behavior was broken (zero genuine phrases), so no stable
  ordering existed to preserve.
- [Score can go low for very long low-tier words, e.g. tier-50 × ~30 letters
  → negative] → Harmless: lower is still better; nothing downstream assumes
  positivity.
- [Ranking change is invisible to `just test` beyond unit tests; real-world
  feel needs the live inventory] → Verify on the deployed site after ship;
  keep wordlist fixed.

## Migration Plan

Static site; ships with the next merge to main via the existing Pages deploy.
No data migration. Rollback = revert the commit; ranking reverts, no state is
affected.

## Open Questions

None outstanding — the earlier question (keep symbols free vs priced) was
resolved by measurement against the real 7-symbol inventory, folded into the
design as Decisions 2 and 5.
