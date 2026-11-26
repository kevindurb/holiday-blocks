# Spec Delta

## ADDED Requirements

### Requirement: Multi-word phrases are defined by word count
The enumeration SHALL classify a result as a multi-word phrase only when it contains at least two word tokens. Symbol tokens SHALL NOT count toward multi-word status; a single word combined with any number of symbol tokens is a single-word result.

#### Scenario: Symbol-decorated single word is not a phrase
- **WHEN** the enumerator finds a result consisting of one word plus one or more symbol tokens
- **THEN** it is ranked and reported as a single-word result, not as a multi-word phrase

#### Scenario: Two words with a symbol are a phrase
- **WHEN** the enumerator finds a result consisting of two or more word tokens, optionally with symbol tokens
- **THEN** it is ranked and reported as a multi-word result

#### Scenario: Phrase results include genuine two-word phrases
- **WHEN** the inventory can spell two distinct words with disjoint blocks
- **THEN** the multi-word result set contains genuine multi-word phrases and is not exclusively composed of single-word-plus-symbol combinations

### Requirement: Ranking rewards block usage
The enumeration SHALL rank results so that, at equal word-frequency tier, candidates whose words are longer (consuming more blocks) rank higher. Frequency tier SHALL remain dominant across tiers: a lower tier SHALL always outrank a higher tier regardless of word length. Symbol tokens SHALL NOT provide a meaningful ranking advantage over words (they remain near-free decorations).

#### Scenario: Longer words win at equal tier
- **WHEN** two results contain words of the same frequency tier but different total length
- **THEN** the result with more total blocks in its words ranks higher

#### Scenario: Frequency tier dominates length
- **WHEN** two results differ in frequency tier by at least one full tier step
- **THEN** the result whose words have the lower total tier ranks higher, even if it uses fewer blocks

#### Scenario: Singles reward block usage
- **WHEN** two single-word results share a frequency tier
- **THEN** the longer word is ranked first

#### Scenario: Symbols do not outrank worthier phrases
- **WHEN** a result combines one word with symbols
- **THEN** it does not outrank a two-word result that uses comparable blocks
