# Spec Delta

## Purpose

Lets the owner of a physical set of 16 four-sided holiday blocks record exactly what is on every face of every block, keep that inventory on their device, and move it between devices, so the rest of the app (phrase solving and enumeration) works from accurate data.

## ADDED Requirements

### Requirement: Block inventory entry
The system SHALL let the user view and edit all 16 blocks, each with exactly 4 faces. Each face SHALL hold either a single letter (case-insensitive, stored uppercase) or one symbol drawn from the supported set: flowers, shamrock, tree, heart, "4", pineapple, USA flag.

#### Scenario: Recording a face
- **WHEN** the user edits a face on block 7 and enters "M"
- **THEN** block 7's face is stored as the letter M, replacing its previous content

#### Scenario: Setting a symbol face
- **WHEN** the user sets a face on block 3 to the tree symbol
- **THEN** block 3's face is stored as the tree symbol and renders as a tree glyph

#### Scenario: Rejecting invalid face content
- **WHEN** the user enters more than one character or a character that is neither a supported letter nor a supported symbol
- **THEN** the face is not saved and the user sees an error for that face

### Requirement: Inventory completeness feedback
The system SHALL show how much of the inventory is filled in (e.g. how many of the 64 faces are recorded) and SHALL warn about empty faces before solving or enumerating is treated as reliable.

#### Scenario: Partial inventory warning
- **WHEN** the user opens the solver with fewer than 64 faces recorded
- **THEN** the app shows a warning that results are based on a partial inventory but still allows solving

#### Scenario: Completion indicator
- **WHEN** the user views the inventory editor
- **THEN** the app shows filled/total face count for the set

### Requirement: Inventory persistence
The system SHALL persist the inventory in the browser's local storage so it survives reloads, and SHALL load it automatically on startup.

#### Scenario: Reload keeps data
- **WHEN** the user records faces, closes the tab, and returns later
- **THEN** the same inventory is shown without re-entry

### Requirement: Inventory export and import
The system SHALL export the full inventory as a JSON file the user can download, and SHALL import such a file, replacing the current inventory after explicit confirmation.

#### Scenario: Exporting a backup
- **WHEN** the user taps export
- **THEN** a JSON file containing all 16 blocks and their faces is downloaded

#### Scenario: Importing on another device
- **WHEN** the user imports a previously exported file
- **THEN** the stored inventory is replaced with the file's contents after the user confirms, and the editor shows the imported faces

#### Scenario: Rejecting a malformed import
- **WHEN** the user imports a file that is not a valid inventory export
- **THEN** the import is rejected, the current inventory is unchanged, and an error message is shown

### Requirement: Inventory sanity aids
The system SHALL show letter frequency across all recorded faces and SHALL flag blocks whose faces are identical to another block, to help catch data-entry mistakes.

#### Scenario: Frequency overview
- **WHEN** the user views the inventory summary
- **THEN** the count of each recorded letter across all blocks is shown

#### Scenario: Duplicate block flag
- **WHEN** two blocks have the same set of four faces
- **THEN** both are flagged in the editor
