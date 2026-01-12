import * as fc from "fast-check";

/**
 * Utility class for handling NaN values in tests.
 * Provides generators that guarantee non-NaN values and validation methods.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Utility class
export class NaNSafeGenerator {
	/**
	 * Generates a safe number within the specified range, guaranteed not to be NaN.
	 *
	 * @param min - Minimum value (default: Number.MIN_SAFE_INTEGER)
	 * @param max - Maximum value (default: Number.MAX_SAFE_INTEGER)
	 * @returns A fast-check arbitrary for safe numbers
	 */
	static generateSafeNumber(
		min: number = Number.MIN_SAFE_INTEGER,
		max: number = Number.MAX_SAFE_INTEGER,
	): fc.Arbitrary<number> {
		// Ensure min/max themselves are not NaN
		const safeMin = Number.isNaN(min) ? 0 : min;
		const safeMax = Number.isNaN(max) ? 0 : max;

		return fc.double({ min: safeMin, max: safeMax, noNaN: true });
	}

	/**
	 * Validates that a value is a valid number (not NaN).
	 *
	 * @param value - The value to check
	 * @returns True if the value is a valid number, false otherwise
	 */
	static validateNumber(value: number): boolean {
		return !Number.isNaN(value);
	}

	/**
	 * Recursively validates that all numeric properties in an object or array are not NaN.
	 *
	 * @param obj - The object or array to validate
	 * @returns True if no NaN values are found, false otherwise
	 */
	static validateObject(obj: unknown): boolean {
		if (obj === null || obj === undefined) {
			return true;
		}

		if (typeof obj === "number") {
			return !Number.isNaN(obj);
		}

		if (Array.isArray(obj)) {
			return obj.every((item) => NaNSafeGenerator.validateObject(item));
		}

		if (typeof obj === "object") {
			return Object.values(obj).every((value) =>
				NaNSafeGenerator.validateObject(value),
			);
		}

		return true;
	}

	/**
	 * Replaces a value with a fallback if it is NaN.
	 * Logs a warning if a NaN value is detected.
	 *
	 * @param value - The value to check
	 * @param fallback - The fallback value to use if value is NaN (default: 0)
	 * @returns The original value or the fallback
	 */
	static replaceNaN(value: number, fallback: number = 0): number {
		if (Number.isNaN(value)) {
			console.warn(`NaN value detected, replacing with fallback: ${fallback}`);
			return fallback;
		}
		return value;
	}
}
