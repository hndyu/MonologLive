import {
	createError,
	ErrorSeverity,
	ErrorType,
	errorHandler,
	MonologAppError,
} from "../src/error-handling/error-handler";
import type {
	InsightGenerator,
	TopicExtractor,
} from "../src/interfaces/summary-generation";
import { GeminiClientImpl } from "../src/summary/gemini-client";
import { SummaryGeneratorImpl } from "../src/summary/summary-generator";
import type { Session, TranscriptSegment } from "../src/types/core";

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

jest.mock("../src/summary/gemini-client");

describe("SummaryGenerator PII Leak Protection", () => {
	let consoleWarnSpy: jest.SpyInstance;

	beforeEach(() => {
		consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
		errorHandler.clearErrorLog();
	});

	afterEach(() => {
		consoleWarnSpy.mockRestore();
	});

	test("should not log raw error with sensitive info in SummaryGenerator", async () => {
		const mockGeminiClient =
			new GeminiClientImpl() as jest.Mocked<GeminiClientImpl>;
		const SENSITIVE_INFO = "PRIVATE_TRANSCRIPT_12345";

		const sensitiveError = new MonologAppError(
			ErrorType.COMMENT_GENERATION,
			ErrorSeverity.HIGH,
			"Failed",
			new Error(`Message containing ${SENSITIVE_INFO}`),
			{ transcript: SENSITIVE_INFO },
		);

		mockGeminiClient.generateSummary.mockRejectedValue(sensitiveError);

		const mockTopicExtractor: jest.Mocked<TopicExtractor> = {
			extractTopics: jest.fn().mockResolvedValue([]),
			getTopicRelevance: jest.fn().mockReturnValue(0),
		};

		const mockInsightGenerator: jest.Mocked<InsightGenerator> = {
			generateInsights: jest.fn().mockResolvedValue([]),
			analyzeEmotionalTone: jest.fn().mockResolvedValue(0),
			identifyConversationPatterns: jest.fn().mockResolvedValue([]),
		};

		const generator = new SummaryGeneratorImpl(
			mockTopicExtractor,
			mockInsightGenerator,
			mockGeminiClient,
		);

		const session: Session = {
			id: "session_1",
			userId: "user_1",
			startTime: new Date(),
			metrics: {
				totalDuration: 1000,
				commentCount: 0,
				interactionCount: 0,
				averageEngagement: 0,
			},
			transcript: [
				{
					text: "test",
					isFinal: true,
					start: 0,
					end: 1000,
					confidence: 1.0,
				} as TranscriptSegment,
			],
			comments: [],
			interactions: [],
		};

		await generator.createSummary(session, "fake-key");

		// Check all calls to console.warn
		for (const call of consoleWarnSpy.mock.calls) {
			const loggedContent = JSON.stringify(call);
			expect(loggedContent).not.toContain(SENSITIVE_INFO);
		}
	});
});
