import * as fc from "fast-check";

/**
 * Utility class to provide safe float generators for fast-check.
 * Ensures that all constraints are valid 32-bit floats using Math.fround().
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Utility class
export class SafeFloatGenerator {
	/**
	 * Generates a float with constraints sanitized for 32-bit precision.
	 * Default constraints include noNaN and noDefaultInfinity for safety.
	 *
	 * @param constraints - fast-check float constraints
	 * @returns A fast-check float arbitrary
	 */
	static float(constraints: fc.FloatConstraints = {}): fc.Arbitrary<number> {
		const safeConstraints: fc.FloatConstraints = {
			noNaN: true,
			noDefaultInfinity: true,
			...constraints,
		};

		if (safeConstraints.min !== undefined) {
			safeConstraints.min = Math.fround(safeConstraints.min);
		}

		if (safeConstraints.max !== undefined) {
			safeConstraints.max = Math.fround(safeConstraints.max);
		}

		return fc.float(safeConstraints);
	}

	/**
	 * Generates a float that is never NaN and never Infinity.
	 *
	 * @param min - Minimum value
	 * @param max - Maximum value
	 * @returns A safe float arbitrary
	 */
	static safeFloat(min = 0, max = 1): fc.Arbitrary<number> {
		return SafeFloatGenerator.float({
			min: Math.fround(min),
			max: Math.fround(max),
			noNaN: true,
			noDefaultInfinity: true,
		});
	}

	/**
	 * Generates a normalized float between 0 and 1.
	 */
	static normalized(): fc.Arbitrary<number> {
		return SafeFloatGenerator.safeFloat(0, 1);
	}
}
