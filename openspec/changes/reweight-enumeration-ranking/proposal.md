# Proposal

## Why

The Explore view's multi-word results are effectively broken: every multi-word slot in the enumeration output is filled by `word + symbol` combinations, so genuine two-word phrases never appear at all (measured on a synthetic 16-block inventory: 150 singles, 95 word+symbol, 55 word+2-symbol, **zero** actual multi-word phrases). Users asking for phrase results (e.g. "min words = 2") get silence, and the single-word list is dominated by short, frequent words while longer, more block-efficient words rank below them despite equally good frequency tiers.

The root cause is the score function `tier + 0.1 × length` combined with symbol tokens costing only `0.1`: symbol combos always undercut real phrases (a word+symbol scores ~10.3; the cheapest two-word phrase is ~20.4), so the 150-slot multi-word bucket saturates with symbol combos before any two-word phrase is even considered. Verification against a real 16-block inventory (7 symbol faces) showed the multi-word bucket contained zero genuine two-word phrases at all — symbol continuations also starve the beam itself, so phrases never reach the bucket.

## What Changes

- **Multi-word bucket is word-count based, not token based**: a result lands in the multi-word bucket only when it contains at least two word tokens. Symbol tokens no longer let an entry qualify as a phrase.
- **Ranking rewards block usage**: per-word score becomes `tier − 0.5 × wordLength` (was `tier + 0.1 × wordLength`). Longer words at the same frequency tier rank higher, so phrases that use more blocks surface first.
- **Singles reweighted too**: the same score applies to single-word results (longer common words rank above shorter ones at equal tier). Frequency tier still dominates length (a tier step is ~10 points; the length effect is ≤ ~8 points within one tier band), so common words still outrank rare words.
- **Symbols are capped and costed** (added during implementation review): at most one symbol per phrase, and each symbol contributes a small fixed cost (`+5`) instead of `+0.1`. With 7 symbol faces in a real inventory, near-free symbols consumed the entire multi-word beam, so *zero* genuine two-word phrases were produced; the owner then chose cost 5 over 10 after seeing that ~7+ erases symbols entirely and ~5 decorates every phrase but keeps them all. Cap unchanged.
- No changes to enumeration breadth, beam width (400), bucket cap (150 per class), word list, or the UI; `maxPhrases`, result caps and the worker protocol stay as they are.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `phrase-discovery`: the enumeration ranking behavior changes (phrase bucket composition and score weighting). Note: this capability's spec is introduced by the pending `add-holiday-blocks-app` change and filtered/sorted presentation is extended by `improve-explore-filters`; this delta adds new requirements rather than editing either pending delta, so archive order stays safe. Tier-dominance preserved: ordering between different frequency tiers is unchanged.

## Impact

- `src/enumerate.js` — score computation in the beam loop; phrase-bucket classification in `consider()`. No API shape changes; `enumerate()` signature unchanged; worker untouched.
- `test/enumerate.test.js` — new expectations for ranking/bucket composition (unit tests with tiny synthetic inventories).
- Behavior change for all users: existing result ordering changes; expect longer common words and multi-word phrases (optionally decorated with symbols) at the top of Explore.
- Verification: beyond `just ci`, rankings can only be sanity-checked against a real inventory in the browser; a synthetic 16-block inventory reproduces the current defect and the fix (zero → dozens of two-word phrases in the multi bucket).
