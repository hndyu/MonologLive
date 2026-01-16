# Implementation Plan - Fix Test, Biome, and TSC Errors

## Phase 1: Investigation and TypeScript Fixes
- [ ] Task: Analyze `src/interfaces/comment-generation.ts` and `src/comment-generation/webllm-processor.ts` to understand the correct `CommentRole` structure and `WebLLMProcessor` methods.
- [ ] Task: Fix TypeScript errors in `tests/security-webllm-injection.test.ts`.
    - [ ] Add missing exports or correct imports for `ConversationContext`.
    - [ ] Update the `CommentRole` mock object to include the missing `triggers` property.
    - [ ] Resolve the `any` type usage violation flagged by Biome.

## Phase 2: Logic and Test Fixes
- [ ] Task: Resolve the `TypeError: processor.generateContextualComment is not a function` in `tests/security-webllm-injection.test.ts`.
    - [ ] Determine if the method name changed or if the mock/class definition is incorrect.
    - [ ] Align the test code with the actual class implementation.
- [ ] Task: Verify the fix by running `npm test tests/security-webllm-injection.test.ts`.

## Phase 3: Biome and Formatting Clean-up
- [ ] Task: Run `npx biome check . --write` to automatically fix formatting and safe linting issues (like import sorting).
- [ ] Task: Manually address any remaining Biome errors that auto-fix couldn't resolve.

## Phase 4: Final Verification
- [ ] Task: Run full `npx tsc --noEmit` validation.
- [ ] Task: Run full `npx biome check .` validation.
- [ ] Task: Run full `npm test` suite.
- [ ] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)
