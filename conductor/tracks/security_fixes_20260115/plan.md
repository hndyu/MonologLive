# Implementation Plan: Security Vulnerability Remediation

## Phase 1: XSS Remediation [checkpoint: 76156d9]
- [x] Task: Fix XSS in Session Detail View (`src/ui/session-detail.ts`) d383849
    - [ ] Update `render()` to set title via `textContent` instead of `innerHTML` interpolation.
    - [ ] Update `renderTranscript()` to set segment text via `textContent` instead of `innerHTML` interpolation.
    - [ ] Update `renameSession()` to set title text via `textContent`.
- [x] Task: Fix XSS in Preference Management UI (`src/ui/preference-management.ts`) dbcfdce
- [x] Task: Verify XSS Fixes [verification passed]
    - [x] Create/Update tests to inject HTML tags in titles and transcripts and verify they are rendered as plain text.
- [x] Task: Conductor - User Manual Verification 'Phase 1: XSS Remediation' (Protocol in workflow.md) [confirmed by user]

## Phase 2: Privacy and LLM Safety
- [x] Task: Prevent PII Leak in Logs (`src/error-handling/error-handler.ts`) a2bdc8b
    - [x] Modify `logError()` to sanitize or mask `error.originalError` and `error.context` before calling `console.error/warn/info`.
- [x] Task: Mitigate Prompt Injection (`src/summary/gemini-client.ts`) 88bda40
    - [x] Update `generateSummary()` prompt to use `"""` delimiters around the `${transcript}` variable.
- [x] Task: Verify Privacy and Safety Fixes [verification passed]
    - [x] Verify that console logs do not contain raw transcripts or API keys.
    - [x] Verify that summary generation still works as expected.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Privacy and LLM Safety' (Protocol in workflow.md)

## Phase 3: Final Verification
- [ ] Task: Run All Tests
    - [ ] Execute `npm test` to ensure no regressions were introduced.
- [ ] Task: Final Build Check
    - [ ] Run `npm run build` to ensure project compiles correctly.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Verification' (Protocol in workflow.md)
