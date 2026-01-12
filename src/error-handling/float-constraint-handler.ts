// Handler for Float constraint errors in property tests and runtime
// Implements automatic correction and logging (Requirement 6.3)

import {
	createError,
	ErrorHandler,
	ErrorSeverity,
	ErrorType,
} from "./error-handler";

/**
 * Handles Float constraint violations by sanitizing values to 32-bit float range
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Utility class
export class FloatConstraintHandler {
	/**
	 * Sanitizes a number to be a valid 32-bit float.
	 * Logs a warning if the value was modified.
	 *
	 * @param value The value to sanitize
	 * @param label A label for logging context
	 * @returns The sanitized value
	 */
	static sanitize(value: number, label: string = "floatValue"): number {
		const sanitized = Math.fround(value);

		if (sanitized !== value) {
			const message = `Float constraint violation for '${label}': ${value} -> ${sanitized} (32-bit precision adjustment)`;
			console.warn(message);

			// Log to global error handler
			const error = createError(
				ErrorType.BROWSER_COMPATIBILITY,
				ErrorSeverity.LOW,
				message,
				undefined,
				{ original: value, sanitized, label },
			);
			ErrorHandler.getInstance().handleError(error);
		}

		return sanitized;
	}

	/**
	 * Validates if a range is valid for 32-bit floats
	 * @param min Minimum value
	 * @param max Maximum value
	 */
	static validateRange(
		min: number,
		max: number,
	): { valid: boolean; correctedMin: number; correctedMax: number } {
		const cMin = Math.fround(min);
		const cMax = Math.fround(max);

		return {
			valid: cMin === min && cMax === max && cMin <= cMax,
			correctedMin: cMin,
			correctedMax: cMax,
		};
	}
}
