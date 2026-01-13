# Integration: Session & Topic Management

## Overview
This track focuses on integrating the `SessionManager` and `TopicManager` into the main application (`main.ts`) to enable proper session lifecycles, data persistence, and topic-aware features. This integration lays the foundation for advanced features like learning and summaries.

## Functional Requirements
1.  **Session Lifecycle:**
    -   `main.ts` must use `SessionManager` to start and end sessions.
    -   Active sessions must be persisted to `IndexedDB` via `SessionManager`.
    -   Session metrics (duration, interaction count) must be tracked.

2.  **Topic Management:**
    -   `main.ts` must use `TopicManager` to handle topic changes.
    -   User-submitted topics from the UI must update the `SessionManager` state.
    -   Topic changes must be tracked in the session history.

3.  **Data Persistence:**
    -   Transcript segments and generated comments must be saved to the active session in `IndexedDB`.
    -   User interactions (e.g., topic changes) must be logged.

4.  **Audio & Transcription Strategy:**
    -   Primary transcription will use the **Web Speech API** for real-time responsiveness.
    -   **EnhancedTranscription** will be available as an **optional post-session action** for high-quality archival.
    -   UI must provide a clear option to "Enhance Transcription" after a session ends.

5.  **Summary Generation Dependency:**
    -   The `SummaryGenerator` dependency in `SessionManager` will be **fully implemented** (not mocked).
    -   It will be configured to use `transcriptionIntegration` if available, but gracefully degrade if not.

## Non-Functional Requirements
-   **No UI Regression:** Existing UI functionality (start/stop, display) must remain operational.
-   **Performance:** Database writes should not block the main thread UI updates.

## Acceptance Criteria
-   [ ] Clicking "Start Session" initializes a new session in `IndexedDB`.
-   [ ] Transcripts and comments are saved to the database in real-time.
-   [ ] Changing the topic updates the internal state and is reflected in the session logs.
-   [ ] Stopping the session finalizes the data.
-   [ ] Post-session, the user sees an option to "Enhance Transcription" (UI placeholder or functional button).
-   [ ] `SummaryGenerator` is correctly instantiated and passed to `SessionManager`.

## Out of Scope
-   Implementation of the "Learning System" (next track).
-   Advanced "Performance Monitoring" (future track).
-   Complex Error Handling UI (future track).
