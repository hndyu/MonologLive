# Requirements Document

## Introduction
This feature addresses specific "Float constraint" errors occurring in `fast-check` property-based tests. These errors currently cause test instability and indicate invalid configuration of floating-point generators. The objective is to audit and fix `fc.float()` usages across the test suite, ensuring valid ranges, finite values, and correct type constraints.

## Requirements

### Requirement 1: Valid Floating Point Test Data
**Objective:** As a Developer, I want valid and realistic floating-point test data, so that tests verify system behavior against possible real-world inputs without crashing due to generator errors.

#### Acceptance Criteria
1. The test system shall generate only finite floating-point numbers for physical properties (volume, duration, speech rate) using `fc.float()` or `fc.double()`.
2. Where `fc.float()` is used, the generator shall be explicitly configured to exclude `NaN` and `Infinity` if the system under test does not handle them.
3. The test system shall remove redundant `.filter(n => !Number.isNaN(n))` calls by using built-in generator constraints (e.g., `{ noNaN: true }`) where supported.

### Requirement 2: Correct Generator Constraint Configuration
**Objective:** As a Developer, I want `fast-check` generators to be configured with valid constraints, so that the test runner does not throw "Float constraint" errors during initialization or execution.

#### Acceptance Criteria
1. When defining `min` and `max` constraints for `fc.float()`, the `min` value shall always be less than or equal to the `max` value.
2. The test system shall use `Math.fround()` for all `min`/`max` constraints passed to `fc.float()` to ensure they are valid 32-bit float representations.
3. If specific test cases require `NaN` or `Infinity`, the test system shall use a separate, explicit generator (e.g., `fc.constant(NaN)`) combined with valid values, rather than relying on unconstrained float generation.

### Requirement 3: Test Suite Stability
**Objective:** As a CI/CD Process, I want stable property-based tests, so that builds are reliable and failures indicate actual regressions.

#### Acceptance Criteria
1. When running the full property test suite, the system shall complete without any "Float constraint" errors from `fast-check`.
2. The test system shall pass all modified property tests (`volume-adaptation.property.test.ts`, `audio-recording.property.test.ts`, etc.) with the corrected generator configurations.