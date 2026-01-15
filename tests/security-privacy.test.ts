import {
	createError,
	ErrorSeverity,
	ErrorType,
	errorHandler,
} from "../src/error-handling/error-handler";

describe("ErrorHandler PII Leak Protection", () => {
	let consoleErrorSpy: jest.SpyInstance;
	let consoleWarnSpy: jest.SpyInstance;
	let consoleInfoSpy: jest.SpyInstance;

	beforeEach(() => {
		consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
		consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
		consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
		errorHandler.clearErrorLog();
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
		consoleWarnSpy.mockRestore();
		consoleInfoSpy.mockRestore();
	});

	const SENSITIVE_TRANSCRIPT =
		"My secret password is '12345' and my API key is 'sk-1234567890'";
	const API_KEY = "sk-1234567890";

	test("should mask sensitive information in error context", async () => {
		const error = createError(
			ErrorType.TRANSCRIPTION,
			ErrorSeverity.HIGH,
			"Transcription failed",
			undefined,
			{ transcript: SENSITIVE_TRANSCRIPT, apiKey: API_KEY },
		);

		await errorHandler.handleError(error);

		const lastCall = consoleErrorSpy.mock.calls[0];
		const loggedContext = JSON.stringify(lastCall);

		expect(loggedContext).not.toContain(SENSITIVE_TRANSCRIPT);
		expect(loggedContext).not.toContain(API_KEY);
	});

	test("should mask sensitive information in originalError message", async () => {
		const originalError = new Error(
			`Failed to process: ${SENSITIVE_TRANSCRIPT}`,
		);
		const error = createError(
			ErrorType.NETWORK,
			ErrorSeverity.CRITICAL,
			"Network error",
			originalError,
		);

		await errorHandler.handleError(error);

		const lastCall = consoleErrorSpy.mock.calls[0];
		const loggedError = lastCall[1];

		expect(loggedError.message).not.toContain(SENSITIVE_TRANSCRIPT);
	});
});
