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
		// biome-ignore lint/suspicious/noExplicitAny: Error can be any type
		error: any,
		// biome-ignore lint/suspicious/noExplicitAny: Counterexample can be any type
		counterExample?: any,
	): string {
		let message = `
--- PROPERTY TEST FAILURE: ${testName} ---
`;
		message += `Error: ${error.message || error}\n`;

		if (counterExample) {
			message += `Counterexample: ${JSON.stringify(counterExample, null, 2)}\n`;
		}

		message += `Stack: ${error.stack || "N/A"}\n`;
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
	// biome-ignore lint/suspicious/noExplicitAny: State can be any structure
	static inspectState(state: any, path: string = "root"): string[] {
		const issues: string[] = [];

		if (state === null || state === undefined) return issues;

		if (typeof state === "number" && Number.isNaN(state)) {
			issues.push(`NaN value detected at '${path}'`);
		} else if (typeof state === "object") {
			for (const key in state) {
				issues.push(
					...TestDebugHelper.inspectState(state[key], `${path}.${key}`),
				);
			}
		}

		return issues;
	}
}
