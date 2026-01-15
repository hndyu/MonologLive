# Implementation Plan - Session Management & History UI

Implement a modal-based history view for browsing past sessions, managing them (rename, delete, favorite, export), and playing back audio synchronized with the transcript.

## Phase 1: Database & Data Logic Enhancement
Infrastructure updates to support management features and efficient searching.

- [x] Task: Update `IndexedDBWrapper` and types to support session `title` (editable) and `isFavorite` status. [commit: 8aa3b2c]
    - [ ] Add `title` and `isFavorite` to session interface and database schema.
    - [ ] Implement `updateSessionMetadata` method in `IndexedDBWrapper`.
- [ ] Task: Implement `SessionHistoryManager` for advanced retrieval.
    - [ ] Create logic for filtering by date range and favorited status.
    - [ ] Implement keyword search across transcripts and titles.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database & Data Logic Enhancement' (Protocol in workflow.md)

## Phase 2: History List UI
Creating the base modal and the list interface for browsing sessions.

- [ ] Task: Create `HistoryModal` component.
    - [ ] Implement base modal overlay logic and trigger from main UI.
    - [ ] Style according to "Reflection Mode" guidelines (minimalist/calm).
- [ ] Task: Implement `SessionList` component.
    - [ ] Render session items with date, title, and duration.
    - [ ] Add search bar and filter toggles (All/Favorites).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: History List UI' (Protocol in workflow.md)

## Phase 3: Session Detail & Synchronized Playback
The core "playback" experience linking audio and text.

- [ ] Task: Create `SessionDetailView` component.
    - [ ] Layout for displaying Transcript, Summary, and Topics.
- [ ] Task: Implement Synchronized Audio Player.
    - [ ] Build audio player UI with progress bar and controls.
    - [ ] Implement transcript segment highlighting based on `currentTime`.
    - [ ] Implement "Click to Seek" functionality in the transcript.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Session Detail & Synchronized Playback' (Protocol in workflow.md)

## Phase 4: Management Actions & Export
Adding interactivity to manage and extract data.

- [ ] Task: Implement Rename, Delete, and Favorite actions.
    - [ ] Add UI controls (icons/buttons) to the list and detail views.
    - [ ] Implement confirmation dialog for deletion.
- [ ] Task: Implement Export functionality.
    - [ ] Create `MarkdownExporter` extension or utility for session packages.
    - [ ] Implement audio file download logic (.webm).
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Management Actions & Export' (Protocol in workflow.md)

## Phase 5: Polishing & Final Integration
Responsive design and performance optimization.

- [ ] Task: Optimize for Mobile.
    - [ ] Ensure touch-friendly playback controls and readable transcript layout.
    - [ ] Adjust modal sizing for small screens.
- [ ] Task: Final System Integration & Performance Check.
    - [ ] Verify memory usage when loading large history.
    - [ ] Run full test suite and ensure >80% coverage.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Polishing & Final Integration' (Protocol in workflow.md)
