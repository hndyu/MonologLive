// Property-based test for NaN value exclusion
// Feature: test-fixes, Property 3: NaN値の排除
// Validates: Requirements 4.1, 4.2, 4.3, 4.4

import fc from "fast-check";
import { NaNSafeGenerator } from "./nan-safe-generator";
import { SafeFloatGenerator } from "./safe-float-generator";

describe("NaN Value Exclusion Property", () => {
	/**
	 * Property 3: NaN値の排除
	 * 任意のテストデータ生成において、NaN値は生成されず、全ての数値計算結果は有効な数値である
	 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
	 */
	test("Property 3: NaN値の排除 - Generators should never produce NaN", () => {
		fc.assert(
			fc.property(
				fc.record({
					safeNum: NaNSafeGenerator.generateSafeNumber(-100, 100),
					safeFloat: SafeFloatGenerator.float({ min: -100, max: 100 }),
					normalized: SafeFloatGenerator.normalized(),
				}),
				(data) => {
					// Property 1: Generators should not produce NaN (Requirement 4.1)
					const noNaNInGenerated = NaNSafeGenerator.validateObject(data);

					// Property 2: Basic arithmetic on safe numbers should not produce NaN (Requirement 4.3)
					const sum = data.safeNum + data.safeFloat;
					const product = data.safeNum * data.normalized;
					const calculationValid =
						NaNSafeGenerator.validateNumber(sum) &&
						NaNSafeGenerator.validateNumber(product);

					return noNaNInGenerated && calculationValid;
				},
			),
			{ numRuns: 100 },
		);
	});

	test("NaNSafeGenerator.replaceNaN should correctly handle NaN values", () => {
		fc.assert(
			fc.property(
				fc.oneof(fc.constant(Number.NaN), fc.double({ noNaN: true })),
				fc.double({ noNaN: true }), // Fallback must be non-NaN for meaningful test
				(val, fallback) => {
					const result = NaNSafeGenerator.replaceNaN(val, fallback);

					// Result should never be NaN
					if (Number.isNaN(val)) {
						return result === fallback;
					} else {
						return result === val;
					}
				},
			),
		);
	});

	test("NaNSafeGenerator.validateObject should detect NaN in nested structures", () => {
		const objWithNaN = {
			a: 1,
			b: {
				c: Number.NaN,
				d: "ok",
			},
			e: [1, 2, Number.NaN],
		};

		const objWithoutNaN = {
			a: 1,
			b: {
				c: 2,
				d: "ok",
			},
			e: [1, 2, 3],
		};

		expect(NaNSafeGenerator.validateObject(objWithNaN)).toBe(false);
		expect(NaNSafeGenerator.validateObject(objWithoutNaN)).toBe(true);
	});
});
