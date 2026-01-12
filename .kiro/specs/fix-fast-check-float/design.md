# Technical Design Document: Fix fast-check Float Constraints

## Overview
**Purpose**: This feature stabilizes the property-based test suite by enforcing valid floating-point constraints. It eliminates "Float constraint" errors and inefficient filtering in tests.
**Users**: Developers running CI/CD pipelines and local tests.
**Impact**: Increases test reliability and performance by ensuring generated test data adheres to valid 32-bit floating-point constraints (finite, non-NaN, valid ranges).

### Goals
- Eliminate all `fast-check` "Float constraint" errors in the test suite.
- Replace manual `.filter(n => !Number.isNaN(n))` with built-in `noNaN` configuration.
- Standardize usage of `Math.fround()` for float range limits.

### Non-Goals
- Adding new test cases (focus is on fixing existing generators).
- Changing production code (changes are limited to `tests/` directory).

## Architecture

### Architecture Pattern & Boundary Map
This feature is a **Refactoring** of existing test infrastructure. It does not introduce new architectural patterns or boundaries. It operates strictly within the **Test Domain**.

**Architecture Integration**:
- **Selected Pattern**: Direct Refactoring (Standardize usage of library API).
- **Domain Boundaries**: No changes.
- **Steering Compliance**: Aligns with "Type Safety" and "Testing Strategy" principles by using strict types and valid data generation.

### Technology Stack
| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Testing | fast-check ^3.15.0 | Property-based testing library | Existing dependency |
| Runtime | Node.js / jsdom | Test execution environment | Standard environment |

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1 | Finite floats for physical props | Property Tests | `fc.float` config | N/A |
| 1.2 | Exclude NaN/Infinity | Property Tests | `noNaN`, `noDefaultInfinity` | N/A |
| 1.3 | Remove redundant filters | Property Tests | `fc.float` config | N/A |
| 2.1 | Valid min/max constraints | Property Tests | `Math.fround()` usage | N/A |
| 2.2 | 32-bit float validity | Property Tests | `Math.fround()` usage | N/A |
| 2.3 | Explicit NaN generators | Property Tests | `fc.constant(NaN)` | N/A |
| 3.1 | Stable full suite run | Test Runner | `npm test` | CI Pipeline |
| 3.2 | Pass modified tests | Test Runner | Individual test files | N/A |

## Components and Interfaces

### Test Domain

#### Property Test Files

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies (P0/P1) | Contracts |
|-----------|--------------|--------|--------------|--------------------------|-----------|
| `*.property.test.ts` | Testing | Validate system properties with random data | 1.1, 1.2, 1.3, 2.1, 2.2 | fast-check (P0) | API |

**Responsibilities & Constraints**
- **Primary Responsibility**: Define generators that produce valid inputs for the System Under Test (SUT).
- **Constraints**: Must not generate data that violates SUT preconditions (e.g., `NaN` for volume) unless explicitly testing error handling.

**Dependencies**
- **External**: `fast-check` library (P0) - used for data generation.

**Contracts**:
- **API Contract**:
  - `fc.float(constraints: FloatConstraints)`
  - Constraints Schema:
    ```typescript
    interface FloatConstraints {
      min?: number; // Must be 32-bit float
      max?: number; // Must be 32-bit float
      noNaN?: boolean; // Set to true
      noDefaultInfinity?: boolean; // Set to true for physical props
    }
    ```

**Implementation Notes**
- **Integration**:
  - Locate all `fc.float()` calls.
  - Remove `.filter(n => !Number.isNaN(n))` chains.
  - Add `{ noNaN: true }` to the configuration object.
  - For physical properties (volume, duration, rate), add `{ noDefaultInfinity: true }`.
  - Wrap all `min` and `max` numeric literals in `Math.fround()`.
- **Validation**:
  - Run individual test files immediately after refactoring to ensure constraints are valid.
  - Verify that `min <= max` after `Math.fround()` conversion.

## Data Models

### Data Contracts & Integration
**Test Data Generation Schema**
Changes are limited to the configuration of test data generators. No production data models are altered.

- **Refactored Generator Pattern**:
  ```typescript
  // Before
  fc.float({ min: 0, max: 100 }).filter(n => !Number.isNaN(n))
  
  // After
  fc.float({
    min: Math.fround(0),
    max: Math.fround(100),
    noNaN: true,
    noDefaultInfinity: true
  })
  ```

## Error Handling

### Error Strategy
- **Generator Errors**: If `fast-check` throws "Float constraint" error (e.g., min > max), it indicates a developer error in the test definition. The fix is to adjust the constraints in the test file.
- **Test Failures**: If the SUT fails with the new generators, it may indicate a real bug or a need to further constrain inputs (e.g., excluding 0 if division by zero occurs).

## Testing Strategy

### Verification Plan
- **Unit Tests**: N/A (We are modifying the tests themselves).
- **Regression Testing**: Run the full test suite (`npm test`) to ensure no new failures are introduced.
- **Stability Testing**: Run the property tests with a high number of runs (e.g., 1000) locally to verify stability.
  - Command: `FC_NUM_RUNS=1000 npm test tests/volume-adaptation.property.test.ts` (and others).

## Security Considerations
None. This change is internal to the test suite and does not affect production security.

## Performance & Scalability
- **Performance**: Removing `.filter()` improves test generation speed by avoiding rejection sampling. This should slightly reduce test execution time.

## Migration Strategy
- **Phase 1**: Apply changes file-by-file.
- **Validation**: Run tests after each file update.
- **Completion**: Run full suite.
