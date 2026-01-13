// Debugging helper for property tests and system validation
// Provides detailed error reporting and inspection utilities (Requirement 6.4)

import type { MonologError } from "./error-handler";

/**
 * Helper for capturing and formatting detailed error information during tests
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Debug utility class
export class TestDebugHelper {
	/**
	 * Formats a property test failure with counterexample and context
	 */
	static formatPropertyFailure(
		testName: string,
		error: unknown,
		counterExample?: unknown,
	): string {
		let message = `
--- PROPERTY TEST FAILURE: ${testName} ---
`;
		const errorObj = error as { message?: string; stack?: string };
		message += `Error: ${errorObj.message || String(error)}\n`;

		if (counterExample) {
			message += `Counterexample: ${JSON.stringify(counterExample, null, 2)}\n`;
		}

		message += `Stack: ${errorObj.stack || "N/A"}\n`;
		message += `-------------------------------------------\n`;

		return message;
	}

	/**
	 * Creates a detailed diagnostic report from an error log
	 */
	static createDiagnosticReport(errors: MonologError[]): string {
		if (errors.length === 0) return "No errors recorded.";

		let report = `Diagnostic Report (${new Date().toISOString()})\n`;
		report += `Total Errors: ${errors.length}\n\n`;

		errors.forEach((err, i) => {
			report += `${i + 1}. [${err.severity.toUpperCase()}] ${err.type}: ${err.message}\n`;
			if (err.context) {
				report += `   Context: ${JSON.stringify(err.context)}\n`;
			}
			if (err.originalError) {
				report += `   Original Error: ${err.originalError.message}\n`;
			}
			report += "\n";
		});

		return report;
	}

	/**
	 * Inspects a state object for potential issues (like NaN values)
	 */
	static inspectState(state: unknown, path: string = "root"): string[] {
		const issues: string[] = [];

		if (state === null || state === undefined) return issues;

		if (typeof state === "number" && Number.isNaN(state)) {
			issues.push(`NaN value detected at '${path}'`);
		} else if (typeof state === "object") {
			const obj = state as Record<string, unknown>;
			for (const key in obj) {
				issues.push(
					...TestDebugHelper.inspectState(obj[key], `${path}.${key}`),
				);
			}
		}

		return issues;
	}
}
