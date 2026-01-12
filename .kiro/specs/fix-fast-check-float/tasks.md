# Implementation Plan

## Implementation Tasks

- [ ] 1. Refactor Audio Processing Property Tests
- [ ] 1.1 (P) Update Volume Adaptation Tests
  - Locate `tests/volume-adaptation.property.test.ts`.
  - Replace `fc.float()` calls with constraints `{ noNaN: true, noDefaultInfinity: true }` for volume, speech rate, and silence duration.
  - Wrap all `min` and `max` values in `Math.fround()`.
  - Remove manual `.filter(n => !Number.isNaN(n))` chains.
  - Verify `min <= max` for all ranges.
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [ ] 1.2 (P) Update Silence Handling Tests
  - Locate `tests/silence-handling.property.test.ts`.
  - Refactor `fc.float()` generators for silence duration, baseline activity, and reduction factors.
  - Enforce finite values using `noDefaultInfinity: true` and `noNaN: true`.
  - Ensure all numeric constraints use `Math.fround()`.
  - Remove redundant filters.
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [ ] 2. Refactor Feature-Specific Property Tests
- [ ] 2.1 (P) Update Audio Recording Tests
  - Locate `tests/audio-recording.property.test.ts`.
  - Update generators for recording duration and quality settings.
  - Apply `noNaN` and `noDefaultInfinity` constraints.
  - Use `Math.fround()` for time and size constraints.
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [ ] 2.2 (P) Update Enhanced Transcription Tests
  - Locate `tests/enhanced-transcription.property.test.ts`.
  - Fix temperature and duration generators.
  - Ensure `min` and `max` are correctly rounded with `Math.fround()`.
  - explicitly handle any negative value constraints if valid.
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [ ] 3. Refactor Interaction & Engagement Property Tests
- [ ] 3.1 (P) Update Session and Interaction Tests
  - Locate `tests/session-summary.property.test.ts` and `tests/interaction-tracking.property.test.ts`.
  - Update `fc.float()` for engagement levels, speech volume, and confidence scores (typically 0-1 ranges).
  - Use `Math.fround(0)` and `Math.fround(1)` for normalized ranges.
  - Remove `!Number.isNaN(n)` filters.
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [ ] 3.2 (P) Update Comment Generation Tests
  - Locate `tests/comment-generation.property.test.ts`.
  - Refactor generators for engagement, volume, and rate inputs.
  - Apply standard `noNaN` and `noDefaultInfinity` constraints.
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [ ] 4. Refactor Remaining Property Tests
- [ ] 4.1 (P) Update Optimization and Persistence Tests
  - Locate `tests/cost-effective-processing.property.test.ts` and `tests/learning-persistence.property.test.ts`.
  - Audit and fix all `fc.float()` usages.
  - Ensure consistent application of `noNaN` and `Math.fround()`.
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [ ] 5. Final Verification
- [ ] 5.1 Verify Test Suite Stability
  - Run the full test suite using `npm test`.
  - Confirm zero "Float constraint" errors in output.
  - Verify that all modified tests pass.
  - _Requirements: 3.1, 3.2_
