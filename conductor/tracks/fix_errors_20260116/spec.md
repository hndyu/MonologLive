# Track Specification: Fix Test, Biome, and TSC Errors

## Overview
This track aims to resolve all currently reported errors in the project's test suite, TypeScript compilation (`tsc`), and Biome linting/formatting checks. The primary focus is on fixing the failures in `tests/security-webllm-injection.test.ts` and clearing the Biome/formatting backlog.

## Functional Requirements
1.  **Resolve TypeScript Errors:**
    *   Fix the export issue in `tests/security-webllm-injection.test.ts` concerning `ConversationContext`.
    *   Fix the `CommentRole` type mismatch (missing `triggers` property) in `tests/security-webllm-injection.test.ts`.
2.  **Fix Failed Test:**
    *   Investigate and resolve the `TypeError: processor.generateContextualComment is not a function` in `tests/security-webllm-injection.test.ts`. This involves aligning the test code with the actual implementation or updating the implementation if it's found to be deficient.
3.  **Clear Biome & Formatting Issues:**
    *   Apply `biome format` to fix all formatting inconsistencies (e.g., in `metadata.json`, `src/main.ts`, etc.).
    *   Address Biome linting errors, specifically the usage of `any` in `tests/security-webllm-injection.test.ts` and import sorting.
4.  **Verify Clean State:**
    *   Ensure `npx tsc --noEmit` returns zero errors.
    *   Ensure `npx biome check .` returns zero errors/warnings.
    *   Ensure `npm test` runs all suites successfully (Green).

## Non-Functional Requirements
*   **Maintainability:** Changes should not introduce regression or suppress legitimate errors without cause.
*   **Consistency:** Code style must adhere to the project's Biome configuration.

## Acceptance Criteria
*   [ ] `npx tsc --noEmit` completes with exit code 0 and no error output.
*   [ ] `npx biome check .` completes with exit code 0 and no error output.
*   [ ] `npm test` completes with all tests passing (including `tests/security-webllm-injection.test.ts`).

## Out of Scope
*   Suppressing console logs/warnings in successful tests (unless they indicate a failure).
*   Enabling new, stricter linting rules beyond the current configuration.
