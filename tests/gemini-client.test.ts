import { GeminiClientImpl } from "../src/summary/gemini-client";

describe("GeminiClient", () => {
	let client: GeminiClientImpl;
	const mockApiKey = "test-api-key";

	beforeEach(() => {
		client = new GeminiClientImpl();
		// Mock fetch globally
		global.fetch = jest.fn();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("should generate a summary from transcript text", async () => {
		const mockResponse = {
			candidates: [
				{
					content: {
						parts: [
							{
								text: JSON.stringify({
									overallSummary: "This was a great session about coding.",
									topics: [
										{
											name: "TypeScript",
											relevance: 0.9,
											mentions: 5,
											sentiment: 0.8,
										},
										{
											name: "Testing",
											relevance: 0.7,
											mentions: 3,
											sentiment: 0.5,
										},
									],
									insights: [
										{
											type: "strength",
											content: "You have a good grasp of TDD.",
											confidence: 0.9,
										},
									],
								}),
							},
						],
					},
				},
			],
		};

		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => mockResponse,
		});

		const transcript = "I love TypeScript and testing. Testing is important.";
		const summary = await client.generateSummary(
			"session-123",
			transcript,
			mockApiKey,
		);

		expect(summary.sessionId).toBe("session-123");
		expect(summary.overallSummary).toContain("coding");
		expect(summary.topics).toHaveLength(2);
		expect(summary.topics[0].name).toBe("TypeScript");
		expect(summary.insights).toHaveLength(1);
		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining("generativelanguage.googleapis.com"),
			expect.any(Object),
		);
	});

	it("should throw an error when API call fails", async () => {
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: false,
			status: 401,
			statusText: "Unauthorized",
			json: async () => ({ error: "Invalid key" }),
		});

		await expect(
			client.generateSummary("id", "text", "wrong-key"),
		).rejects.toThrow();
	});
});
