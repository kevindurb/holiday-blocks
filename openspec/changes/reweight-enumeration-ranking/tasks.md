# Tasks

## 1. Enumeration reweighting

- [x] 1.1 In `src/enumerate.js`, introduce a named `WORD_LENGTH_WEIGHT` constant (0.5) and change the word branch of the beam to `state.score + entry.tier − entry.length * WORD_LENGTH_WEIGHT`; leave the symbol branch unchanged; verify by reading the diff and running `just test` (existing tests still pass, no behavior of symbol scoring touched)
- [x] 1.2 In `enumerate()`'s `consider()`, classify a result as multi-word only when it contains ≥2 word tokens (symbols do not count); verify with a targeted unit test that one-word+symbol results land in the singles class
- [x] 1.3 Add unit tests in `test/enumerate.test.js` covering: two-word results present for a synthetic inventory where previously none appeared; at equal tier the longer word ranks first; a full tier step outranks a length advantage; one-word-plus-symbol is not classified as a multi-word phrase; `just test` passes

## 2. Diagnostic check against realistic data

- [x] 2.1 Write a scratch script (not committed) replicating the design-doc measurement on a synthetic 16-block inventory; verify the multi-word bucket now contains genuine ≥2-word phrases and that no words of length < 2 appear in output; record the observation in the PR/commit message

## 3. Verification

- [x] 3.1 Run `just ci` and fix any failures in this change's files; verify it exits clean
- [ ] 3.2 On the deployed site (after merge/deploy), run Explore as-is and with `min words = 2`; confirm genuine multi-word phrases appear, `MERRY CHRISTMAS`-style results rank above symbol-decorated singles, and no regressions in cancellation/progress; note result in the change
