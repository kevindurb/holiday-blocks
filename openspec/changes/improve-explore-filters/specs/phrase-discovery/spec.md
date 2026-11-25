# Spec Delta

## ADDED Requirements

### Requirement: Explore result filters
The Explore view SHALL provide filter controls that narrow the already-loaded result list without re-running enumeration: a minimum word count, a minimum number of letters per word (letters only; symbol tokens are exempt), a minimum total letter count across the phrase, a symbol mode (any, includes a symbol, excludes symbols), and a case-insensitive free-text search over the result text. All filters SHALL combine conjunctively and apply instantly on the client.

#### Scenario: Filters combine
- **WHEN** the user sets both a minimum word count of 2 and a minimum of 4 letters per word
- **THEN** only results with at least 2 words in which every word has at least 4 letters are shown

#### Scenario: Symbol mode excludes
- **WHEN** the user selects "excludes symbols"
- **THEN** no displayed result contains a symbol token

#### Scenario: Symbol mode includes
- **WHEN** the user selects "includes a symbol"
- **THEN** every displayed result contains at least one symbol token

#### Scenario: Text search
- **WHEN** the user types a substring into the search box
- **THEN** only results whose displayed text contains that substring (case-insensitively) are shown

#### Scenario: Changing any filter updates the list immediately
- **WHEN** the user changes or clears any filter control
- **THEN** the visible results and the result count update without re-running enumeration

### Requirement: Default view suppresses short-word noise
The Explore view SHALL default its filters to hiding results whose words are shorter than 3 letters, so one- and two-letter junk singles are not shown initially. The user SHALL be able to lower the minimum letters per word to 1 to see everything that was enumerated.

#### Scenario: Default hides short junk
- **WHEN** enumeration completes and the user has not touched the filter controls
- **THEN** results containing a word shorter than 3 letters are not displayed

#### Scenario: Opt back into everything
- **WHEN** the user sets minimum letters per word to 1
- **THEN** all enumerated results that match the remaining active filters are displayed

### Requirement: Result count and clear filters
The Explore view SHALL display how many results are shown out of the total enumerated, and SHALL provide a control that resets all filters to their defaults.

#### Scenario: Count reflects filtering
- **WHEN** any filter is active
- **THEN** the view shows "Showing X of Y" where X is the number of visible results and Y is the number of enumerated results

#### Scenario: Clear filters
- **WHEN** the user activates the clear-filters control
- **THEN** every filter returns to its default value and the default view is shown

### Requirement: Filtered empty state
When filters hide every enumerated result, the Explore view SHALL show an explicit empty state that names the situation and offers a one-click way to clear the filters, instead of a blank list.

#### Scenario: No matches under active filters
- **WHEN** enumeration found results but none match the active filters
- **THEN** the view shows an empty-state message and a clear-filters action
- **AND** activating that action restores the default filtered view

### Requirement: Filter state is session-scoped
Filter state SHALL NOT persist across page loads or be written to storage; each visit starts from the default filters.

#### Scenario: Reload resets filters
- **WHEN** the user reloads the page after setting custom filters
- **THEN** the filter controls show their default values
