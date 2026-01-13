import { GeminiClientImpl } from "../src/summary/gemini-client";
import {
	BasicInsightGenerator,
	BasicTopicExtractor,
	SummaryGeneratorImpl,
} from "../src/summary/summary-generator";
import type { Session, SessionSummary } from "../src/types/core";

// Mock GeminiClient
jest.mock("../src/summary/gemini-client");

describe("SummaryGenerator Gemini Integration", () => {
	let summaryGenerator: SummaryGeneratorImpl;
	let mockGeminiClient: jest.Mocked<GeminiClientImpl>;

	beforeEach(() => {
		mockGeminiClient = new GeminiClientImpl() as jest.Mocked<GeminiClientImpl>;
		summaryGenerator = new SummaryGeneratorImpl(
			new BasicTopicExtractor(),
			new BasicInsightGenerator(),
			undefined, // audioManager
			mockGeminiClient,
		);
	});

	it("should use Gemini API when API key is provided", async () => {
		const session: Session = {
			id: "session-1",
			userId: "user-1",
			startTime: new Date(),
			transcript: [
				{
					start: 0,
					end: 1000,
					text: "Hello world",
					confidence: 1.0,
					isFinal: true,
				},
			],
			comments: [],
			interactions: [],
			metrics: {
				totalDuration: 1000,
				commentCount: 0,
				interactionCount: 0,
				averageEngagement: 0,
			},
		};

		const mockSummary: SessionSummary = {
			sessionId: "session-1",
			overallSummary: "Gemini summary",
			topics: [],
			insights: [],
			generatedAt: new Date(),
		};

		mockGeminiClient.generateSummary.mockResolvedValue(mockSummary);

		const summary = await summaryGenerator.createSummary(
			session,
			"test-api-key",
		);

		expect(mockGeminiClient.generateSummary).toHaveBeenCalledWith(
			"session-1",
			expect.stringContaining("Hello world"),
			"test-api-key",
		);
		expect(summary.overallSummary).toBe("Gemini summary");
	});

	it("should fallback to Basic implementation when API key is missing", async () => {
		const session: Session = {
			id: "session-1",
			userId: "user-1",
			startTime: new Date(),
			transcript: [
				{
					start: 0,
					end: 1000,
					text: "Hello world",
					confidence: 1.0,
					isFinal: true,
				},
			],
			comments: [],
			interactions: [],
			metrics: {
				totalDuration: 1000,
				commentCount: 0,
				interactionCount: 0,
				averageEngagement: 0,
			},
		};

		const summary = await summaryGenerator.createSummary(session);

		expect(mockGeminiClient.generateSummary).not.toHaveBeenCalled();
		expect(summary.overallSummary).toContain("minutes"); // Basic implementation output
	});

	it("should fallback to Basic implementation when Gemini API fails", async () => {
		const session: Session = {
			id: "session-1",
			userId: "user-1",
			startTime: new Date(),
			transcript: [
				{
					start: 0,
					end: 1000,
					text: "Hello world",
					confidence: 1.0,
					isFinal: true,
				},
			],
			comments: [],
			interactions: [],
			metrics: {
				totalDuration: 1000,
				commentCount: 0,
				interactionCount: 0,
				averageEngagement: 0,
			},
		};

		mockGeminiClient.generateSummary.mockRejectedValue(new Error("API Error"));

		const summary = await summaryGenerator.createSummary(
			session,
			"test-api-key",
		);

		expect(mockGeminiClient.generateSummary).toHaveBeenCalled();
		expect(summary.overallSummary).toContain("minutes"); // Basic implementation output
	});
});
