# Spec Delta

## Purpose

Lets the user discover what their block set can spell: solve an arbitrary phrase into concrete block placements, and enumerate every word and multi-word phrase (up to a 4-word cap) the set can spell, with symbols acting as single-token words shown as glyphs.

## ADDED Requirements

### Requirement: Spell checker for a given phrase
The system SHALL accept a phrase typed by the user and report every way to lay it out with the recorded blocks. A solution assigns one block per position in the phrase; each block is used at most once; a letter position requires a block face with that letter; a symbol position requires a block face with that symbol; a phrase of more than 16 tokens is rejected.

#### Scenario: Unique solution
- **WHEN** the user enters a phrase that can be laid out exactly one way
- **THEN** the app shows the position-by-position assignment: which block number goes where and which face (letter or symbol) is shown

#### Scenario: Multiple solutions
- **WHEN** the entered phrase can be laid out more than one way
- **THEN** all distinct assignments are listed, each showing its block numbers and faces

#### Scenario: Phrase cannot be spelled
- **WHEN** the entered phrase cannot be laid out with the recorded blocks
- **THEN** the app reports that no solution exists and indicates which tokens cannot be matched

#### Scenario: Case and punctuation in input
- **WHEN** the user enters a mixed-case phrase with ordinary punctuation or multiple spaces
- **THEN** letters are matched case-insensitively and non-letter, non-symbol characters are ignored

### Requirement: Symbols as phrase tokens
The system SHALL treat a symbol face as a single token standing for one word position in the phrase, displayed as its glyph, and SHALL NOT expand symbols to any word meaning. The user MAY insert a symbol into a phrase either by naming it or by picking it in the input.

#### Scenario: Phrase ending in a symbol
- **WHEN** the user enters `MERRY` followed by the tree symbol
- **THEN** the solver treats it as the two-token phrase MERRY + tree and finds blocks for both, e.g. blocks spelling M-E-R-R-Y plus the block showing the tree

#### Scenario: No word expansion
- **WHEN** the user enters a symbol token
- **THEN** the solver never substitutes a dictionary word for it and never rewrites it to another token

### Requirement: Phrase enumeration
The system SHALL enumerate words and multi-word phrases (at most 4 words and at most 16 blocks per phrase) spellable with the recorded blocks, using a bundled open dictionary filtered by letter-multiset feasibility, and SHALL present results ranked with more common words first.

#### Scenario: Dictionary word found
- **WHEN** the inventory can spell a dictionary word
- **THEN** the word appears in the enumeration with at least one full block assignment

#### Scenario: Multi-word phrase found
- **WHEN** two spellable words can be laid out consecutively without reusing a block
- **THEN** the combined phrase appears in the enumeration

#### Scenario: Cap enforced
- **WHEN** a candidate phrase would exceed 4 words or require more than 16 blocks
- **THEN** it is not shown

#### Scenario: Symbol tokens in enumeration
- **WHEN** the inventory contains symbol faces
- **THEN** the enumeration may combine a symbol as a single token with other tokens (e.g. `MERRY 🎄`), displaying the glyph rather than any word

### Requirement: Enumeration responsiveness
The system SHALL keep the page responsive while enumerating, SHALL show progress while enumeration runs, and SHALL let the user cancel a running enumeration.

#### Scenario: Long enumeration does not freeze the UI
- **WHEN** an enumeration over the full dictionary is running
- **THEN** the interface remains responsive and shows that work is in progress

#### Scenario: Cancelling an enumeration
- **WHEN** the user cancels a running enumeration
- **THEN** enumeration stops and the partial results gathered so far remain available

### Requirement: Result presentation
The system SHALL group results by phrase text. Each group SHALL show how many distinct block assignments realize the phrase and let the user expand the group to see each assignment in full.

#### Scenario: Grouped results
- **WHEN** the same phrase has several block assignments
- **THEN** it appears once with a count, expandable to list every assignment

#### Scenario: Unsolvable partial inventory
- **WHEN** the inventory is incomplete (fewer than 64 faces recorded)
- **THEN** enumeration and solving still run, and results are labeled as based on a partial inventory
