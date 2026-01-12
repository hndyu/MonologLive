# Research & Design Decisions: fast-check Float Fix

## Summary
- **Feature**: fix-fast-check-float
- **Discovery Scope**: Extension (Improvement of existing test suite)
- **Key Findings**:
  - `fast-check` v3.15+ supports `noNaN` and `noDefaultInfinity` natively.
  - `Math.fround()` is essential for ensuring 32-bit float validity in constraints to avoid `min > max` errors caused by precision loss.
  - Existing code inefficiently filters generated values, which slows down tests and reduces the effective search space.

## Research Log

### fast-check Float Constraints
- **Context**: Investigating how to prevent "Float constraint" errors and infinite values in test data.
- **Sources Consulted**: fast-check official documentation (v3.23.2 context from search).
- **Findings**:
  - `fc.float(constraints)` accepts `min`, `max`, `noNaN`, `noDefaultInfinity`.
  - `noNaN: true` prevents `NaN` generation.
  - `noDefaultInfinity: true` limits the range to finite 32-bit float max values when no min/max are provided.
  - Defaults: `noNaN: false`, `noDefaultInfinity: false` (includes `Infinity`).
- **Implications**:
  - We can replace `.filter(n => !Number.isNaN(n))` with `{ noNaN: true }`.
  - We should use `{ noDefaultInfinity: true }` for physical properties like duration/volume that shouldn't be infinite.
  - `min` and `max` should be passed through `Math.fround()` to ensure they are valid 32-bit floats, matching the generator's output type.

### Math.fround Usage
- **Context**: Ensuring valid range constraints.
- **Findings**:
  - JavaScript numbers are 64-bit doubles. `fc.float()` generates 32-bit floats.
  - If a 64-bit `min` is provided that cannot be exactly represented in 32-bit, it might be rounded in a way that makes `min > max` (if they are close) or invalidates the generator.
  - `Math.fround(x)` converts x to the nearest 32-bit float representation.
- **Implications**: Always wrap min/max literals in `Math.fround()` when defining constraints for `fc.float()`.

## Design Decisions

### Decision: Direct Refactoring over Wrapper
- **Context**: Choosing between refactoring calls individually or creating a `safeFloat` wrapper.
- **Alternatives Considered**:
  1. **Wrapper Function**: Create `test-utils/generators.ts` with `const safeFloat = (c) => fc.float({...c, noNaN: true})`.
  2. **Direct Refactoring**: Update each `fc.float` call in place.
- **Selected Approach**: Direct Refactoring.
- **Rationale**: The standard `fast-check` API is expressive enough. Adding a custom wrapper obscures the underlying constraints and deviates from standard usage patterns found in external documentation/examples. The number of call sites (~70) is manageable.
- **Trade-offs**: More code changes now, but cleaner, standard code for the future.

### Decision: Enforce Finite Values for Physical Properties
- **Context**: Volume, speech rate, and duration properties.
- **Selected Approach**: Use `{ noNaN: true, noDefaultInfinity: true, min: Math.fround(0) }`.
- **Rationale**: Physical quantities cannot be `NaN` or `Infinity`. Tests should reflect domain constraints.
- **Follow-up**: Verify that no tests *rely* on `NaN` to test error handling (none found in current property tests which mostly test "happy path" stability).

## Risks & Mitigations
- **Risk 1**: `min > max` error if `Math.fround` rounds min up and max down significantly for narrow ranges.
  - **Mitigation**: Ensure `min` is strictly less than `max` in logic, or use `fc.float({ min, max })` where `min` and `max` are distinct enough. For 0-1 ranges, `Math.fround(0)` and `Math.fround(1)` are safe.
- **Risk 2**: Removing `Infinity` might hide bugs where the system crashes on `Infinity`.
  - **Mitigation**: Property tests for "stability" aim to prove the system works for *valid* inputs. Error handling for invalid inputs (like Infinity) should be tested in separate unit tests if critical, not randomly in stability tests.

## References
- [fast-check Documentation](https://fast-check.dev/)
- [MDN Math.fround](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround)
