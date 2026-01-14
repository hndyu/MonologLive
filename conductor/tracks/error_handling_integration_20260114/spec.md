# Specification: Error Handling Integration (Track D)

## Overview
This track focuses on integrating the existing `ErrorHandler` and `ErrorUI` components into the main application logic (`main.ts`) and its dependent modules. Currently, error handling is fragmented and relies on basic `console.error` calls. This integration will provide a unified, user-friendly system for reporting errors, managing recovery strategies, and maintaining a robust application state.

## Functional Requirements
- **Unified Error Handling:** Replace all `try-catch` blocks and manual error logging in `main.ts` and related managers (SessionManager, AudioManager, CommentSystem, etc.) with the `ErrorHandler.getInstance().handleError()` pattern.
- **User-Friendly Notifications:** Use `ErrorUI` to display floating "toast" notifications in the top-right corner for errors of all severities.
- **Severity-Based UI Behavior:**
    - **LOW/MEDIUM:** Auto-hide notifications after 5-10 seconds.
    - **HIGH/CRITICAL:** Persist notifications until manually dismissed or resolved.
- **Specific Error Scenarios:**
    - **Microphone Permissions:** Catch permission errors and provide clear instructions to the user.
    - **IndexedDB Failures:** Gracefully handle storage errors by informing the user and falling back to in-memory state where possible.
    - **LLM/Gemini API Failures:** Detect and report issues with external AI services (quota, network, etc.).
    - **Browser Compatibility:** Explicitly check and report missing support for `Web Speech API` or `MediaRecorder`.
- **Error Recovery:** Implement and trigger the `fallbackAction` defined in `ErrorRecoveryStrategy` for retryable errors.
- **Global Error Catching:** Set up a global `window.onerror` and `window.onunhandledrejection` listener to catch unexpected crashes and report them through the system.

## Non-Functional Requirements
- **Zero Regression:** Ensure that error handling does not introduce new bugs or performance bottlenecks.
- **Maintainability:** Standardize the use of `createError` utility to ensure consistent error metadata.
- **Testability:** Integration must be verifiable via unit tests (mocking `ErrorUI` and `ErrorHandler`).

## Acceptance Criteria
- [ ] `main.ts` is fully migrated to use `ErrorHandler`.
- [ ] `ErrorUI` successfully displays notifications for simulated errors in all categories (Permission, Storage, API, Compatibility).
- [ ] High-severity errors stay visible until dismissed.
- [ ] "Retry" buttons in notifications correctly trigger the recovery logic.
- [ ] The system status indicator in the UI reflects the current error state correctly.

## Out of Scope
- Implementing advanced telemetry or server-side error logging (beyond current local logging).
- Redesigning the `ErrorUI` visual style (using existing implementation).
