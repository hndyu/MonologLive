# Implementation Plan - Error Handling Integration

## Phase 1: Setup and Validation [checkpoint: 2fb1e09]
- [x] Task: Create `tests/error-handling-integration.test.ts` to test `ErrorHandler` integration with `main.ts` logic.
    - Write tests simulating `VOICE_INPUT` error (Permission denied).
    - Write tests simulating `STORAGE` error (IndexedDB failure).
    - Write tests simulating `COMMENT_GENERATION` error (API failure).
- [x] Task: Verify existing `ErrorHandler` and `ErrorUI` implementation details in `src/error-handling/`.
    - Ensure `ErrorUI` singleton is correctly exposed.
    - Ensure `ErrorHandler` singleton is correctly exposed.
- [x] Task: Conductor - User Manual Verification 'Setup and Validation' (Protocol in workflow.md)

## Phase 2: Core Integration (Main Application) [checkpoint: 42268fe]
- [x] Task: Update `src/main.ts` to import `errorHandler`, `errorUI`, and `createError`.
- [x] Task: Initialize `global error listeners` (window.onerror, unhandledrejection) in `main.ts`.
- [x] Task: Refactor `initialize()` method in `main.ts` to use `errorHandler.handleError`.
    - Handle `AudioRecorder` compatibility check failures.
    - Handle `Storage` initialization failures.
- [x] Task: Refactor `startSession()` and `stopSession()` in `main.ts` to use `errorHandler.handleError`.
    - Handle `VoiceManager.startListening` errors.
    - Handle `SessionManager.startSession/endSession` errors.
- [x] Task: Conductor - User Manual Verification 'Core Integration (Main Application)' (Protocol in workflow.md)

## Phase 3: Module-Level Integration [checkpoint: c82faa5]
- [x] Task: Refactor `src/audio/audio-recorder.ts` to throw typed `MonologError` or compatible errors.
- [x] Task: Refactor `src/session/session-manager.ts` to allow better error propagation (or use ErrorHandler internally).
- [x] Task: Refactor `src/summary/gemini-client.ts` to throw specific `MonologError` types for API failures.
- [x] Task: Update `main.ts` event handlers (voice manager callbacks) to use `errorHandler`.
- [x] Task: Conductor - User Manual Verification 'Module-Level Integration' (Protocol in workflow.md)

## Phase 4: UI Feedback & Verification [checkpoint: 8791ca3]
- [x] Task: Update `src/error-handling/error-ui.ts` to ensure it renders correctly on top of existing UI (z-index check).
- [x] Task: Create a manual test scenario (e.g., a "Trigger Error" debug button temporarily) to verify the UI flow for each error type.
- [x] Task: Run full integration test suite ensuring no regressions in main user flows.
- [x] Task: Conductor - User Manual Verification 'UI Feedback & Verification' (Protocol in workflow.md)
