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

**2. Score `tier − 0.5 × wordLength` per word; symbols stay at +0.1.**
Length contributes −0.5 per letter: at equal tier, longer words win
(e.g. tier-10 `QUICKLY` (7) = 6.5 vs `IF` (2) = 9.0). Tier dominance is
preserved: one tier step (10) exceeds the maximum length effect any realistic
span of lengths can produce within a pair comparison (the gap between two
words is at most ~16 letters ≈ 8 points < 10), so ordering between tiers
never flips. Symbols stay ~free by explicit product decision: phrase quality
is judged by the words; symbols are garnish and remain available everywhere.
Alternatives considered:
- `tier + 0.1·len` (today): short-word bias — rejected (the bug itself).
- Symbol price ≈ tier-10 word (~10): measured to purge symbol combos almost
  entirely; user preferred symbols staying free. Captured as an open lever
  (see Open Questions) rather than decided silently.
- Per-block credit on symbols as well: produces maximal-block stuffing
  ("QUICKLY 🎄 ❤️ SO"); rejected by the same measurement.

**3. Singles reweighted too.**
Uniform rule, no special cases: a single formula for all words. Side effect:
top singles become long tier-10 words (e.g. PROVIDES, SUBJECTS) instead of
THE/OF/AND. Consciously accepted; the frequency tier still orders across
tiers, and `improve-explore-filters` gives users the min/max levers if they
prefer short words.

**4. Implementation is two surgical edits in `src/enumerate.js`.**
`const LAMBDA = 0.5` named constant; one line in the word expansion branch,
unchanged symbol branch, and the word-count predicate in `consider()`. No
signature changes; worker and UI untouched.

## Verification plan

Unit tests with tiny synthetic inventories/word tables asserting:
(a) a one-word+symbol result is classified single; (b) two words classify as
multi; (c) at equal tier a longer word ranks first; (d) tier dominates length;
(e) multi bucket contains genuine phrases with a word list crafted so that all
top results pre-fix are symbol combos. Plus a manual run of the real app on
the deployed site (this project's established verification path).

## Risks / Trade-offs

- [Symbols ride along on top results because they're free] → Accepted by
  product decision; if it grates after real-world use, raise the symbol cost
  constant — isolated one-line change with existing tests to catch regressions.
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

None blocking. The one deferred knob (whether symbols should cost more if the
free-symbol output annoys in practice) is separable and can be revisited
post-ship without changing specs.
