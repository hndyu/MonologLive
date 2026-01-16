// Import with .ts extension to bypass jest moduleNameMapper for "webllm-processor"
import { WebLLMProcessor } from "../src/comment-generation/webllm-processor.ts";
import type { CommentRole } from "../src/interfaces/comment-generation";
import type { ConversationContext } from "../src/types/core";

// Mock the worker factory to avoid import.meta.url issues in Jest
jest.mock("../src/comment-generation/worker-factory", () => ({
	createWebLLMWorker: () => ({
		postMessage: jest.fn(),
		onmessage: null,
		terminate: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	}),
}));

// Ensure we use the real implementation, not the mock

describe("WebLLMProcessor Prompt Injection Mitigation", () => {
	let processor: WebLLMProcessor;

	beforeEach(() => {
		processor = new WebLLMProcessor();

		// Mock the engine and modelInfo to pretend it's loaded
		// @ts-expect-error - Accessing private/protected property for testing
		processor.engine = {
			chat: {
				completions: {
					create: jest.fn().mockResolvedValue({
						choices: [{ message: { content: "Test comment" } }],
					}),
				},
			},
		};
		// Force set modelInfo state for testing
		// @ts-expect-error - Accessing private/protected property for testing
		processor.modelInfo = {
			name: "test-model",
			isLoaded: true,
			capabilities: [],
		};
	});

	test("should escape double quotes in topic and transcript", async () => {
		const context: ConversationContext = {
			recentTranscript: 'Speech with "quotes" breakout',
			currentTopic: 'Topic with "quotes"',
			userEngagementLevel: 0.5,
			speechVolume: 0.5,
			speechRate: 1.0,
			silenceDuration: 0,
		};
		const role: CommentRole = {
			type: "reaction",
			patterns: [],
			weight: 1.0,
			triggers: [],
		};

		await processor.generateContextualComment(context, role);

		// @ts-expect-error - Accessing private/protected property for testing
		const engine = processor.engine;
		if (!engine) throw new Error("Engine is null");

		// @ts-expect-error - Accessing mock property
		const createCall = engine.chat.completions.create.mock.calls[0][0];
		const userPrompt = createCall.messages[1].content;

		// Verify escaping
		expect(userPrompt).toContain('Topic: Topic with \\"quotes\\"');
		expect(userPrompt).toContain(
			'Recent speech: "Speech with \\"quotes\\" breakout"',
		);
	});
});
