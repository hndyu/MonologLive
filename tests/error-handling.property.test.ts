// Property-based test for error handling and fallback mechanisms
// Feature: test-fixes, Property 5: エラーハンドリングのフォールバック
// Validates: Requirements 6.1, 6.2, 6.3

import fc from "fast-check";
import { databaseErrorHandler } from "../src/error-handling/database-error-handler";
import { ErrorHandler, ErrorType } from "../src/error-handling/error-handler";
import { FloatConstraintHandler } from "../src/error-handling/float-constraint-handler";

describe("Error Handling Fallback Properties", () => {
	/**
	 * Property 5: エラーハンドリングのフォールバック
	 * 任意のシステムエラー発生時において、適切なフォールバック処理が実行され、テストが継続可能な状態を維持する
	 * Validates: Requirements 6.1, 6.2, 6.3
	 */
	test("Property 5: Database Fallback - Should switch to mock on init error", async () => {
		// Ensure fresh state
		databaseErrorHandler.resetState();

		const error = new Error("Connection timed out");
		const handled = await databaseErrorHandler.handleInitializationError(error);

		expect(handled).toBe(true);
		expect(databaseErrorHandler.isUsingMock()).toBe(true);
	});

	test("Property 5: Float Sanitization - Should correctly sanitize any number to 32-bit", () => {
		fc.assert(
			fc.property(fc.double(), (val) => {
				const sanitized = FloatConstraintHandler.sanitize(val, "testValue");

				// Property 1: Result should be a valid number if input was valid (Requirement 6.3)
				// If input is NaN, output should also be NaN
				const isValid = Number.isNaN(val)
					? Number.isNaN(sanitized)
					: !Number.isNaN(sanitized);

				// Property 2: Result should match Math.fround result
				// Use Object.is() because NaN === NaN is false but Object.is(NaN, NaN) is true
				const matchesFround = Object.is(sanitized, Math.fround(val));

				return isValid && matchesFround;
			}),
		);
	});

	test("Property 5: Error Callback - Should notify registered callbacks", async () => {
		const handler = ErrorHandler.getInstance();
		let notified = false;

		handler.onError(ErrorType.STORAGE, () => {
			notified = true;
		});

		await databaseErrorHandler.handleOperationError(
			"save",
			new Error("IO Error"),
		);

		expect(notified).toBe(true);
	});
});
