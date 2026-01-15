import { MonologLiveApp } from "../src/main";
import { WhisperTranscription } from "../src/transcription/enhanced-transcription";
import { TranscriptionIntegration } from "../src/transcription/transcription-integration";

// Mock the transformers library
jest.mock("@huggingface/transformers", () => ({
	pipeline: jest.fn(),
}));

// Mock dynamic import for main.ts
jest.mock("../src/transcription/enhanced-transcription", () => {
	const original = jest.requireActual(
		"../src/transcription/enhanced-transcription",
	);
	return {
		...original,
		WhisperTranscription: jest.fn().mockImplementation((...args) => {
			return new original.WhisperTranscription(...args);
		}),
	};
});

import { pipeline } from "@huggingface/transformers";

const {
	WhisperTranscription: MockWhisperTranscription,
} = require("../src/transcription/enhanced-transcription");

describe("Whisper Concurrency Tests", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reset singleton if necessary, but here we'll create new instances
	});

	describe("MainApp.getWhisper concurrency", () => {
		test("should instantiate WhisperTranscription only once when called concurrently", async () => {
			const app = new MonologLiveApp();

			// Call getWhisper multiple times simultaneously
			const promises = Array(5)
				.fill(null)
				.map(() => app.getWhisper());
			await Promise.all(promises);

			// Verify constructor call count
			// Note: This might fail in the current implementation because it enters the if (!this.whisper) block multiple times
			expect(MockWhisperTranscription).toHaveBeenCalledTimes(1);
		});
	});

	describe("WhisperTranscription.loadModel concurrency", () => {
		test("should wait for the same promise when loadModel is called concurrently", async () => {
			const whisper = new WhisperTranscription();

			// Mock pipeline to be slow

			let resolvePipeline: (value: unknown) => void = () => {};

			const pipelinePromise = new Promise((resolve) => {
				resolvePipeline = resolve;
			});

			(pipeline as jest.Mock).mockReturnValue(pipelinePromise);

			// Call loadModel multiple times simultaneously

			const loadPromises = Array(5)
				.fill(null)
				.map(() => whisper.loadModel());

			// Resolve the pipeline

			if (resolvePipeline)
				resolvePipeline(() => Promise.resolve({ text: "test" }));

			const results = await Promise.all(loadPromises);

			// In current implementation, the 2nd-5th calls return 'false' immediately because isLoading is true
			// We want them all to return 'true' (success) after waiting
			expect(results).toEqual([true, true, true, true, true]);
			expect(pipeline).toHaveBeenCalledTimes(1);
		});

		test("should allow retry if previous load failed", async () => {
			const whisper = new WhisperTranscription();

			// First attempt fails
			(pipeline as jest.Mock).mockRejectedValueOnce(new Error("First fail"));
			await whisper.loadModel();
			expect(whisper.getModelInfo().status).toBe("error");

			// Second attempt should be allowed
			(pipeline as jest.Mock).mockResolvedValue(() =>
				Promise.resolve({ text: "test" }),
			);
			const result = await whisper.loadModel();

			expect(result).toBe(true);
			expect(whisper.getModelInfo().status).toBe("loaded");
			expect(pipeline).toHaveBeenCalledTimes(2);
		});
	});

	describe("TranscriptionIntegration.initialize concurrency", () => {
		test("should initialize only once when called concurrently", async () => {
			const integration = new TranscriptionIntegration();

			// Call initialize multiple times simultaneously
			const promises = Array(5)
				.fill(null)
				.map(() => integration.initialize());
			await Promise.all(promises);

			// If we could track the dynamic import, we would check that here.
			// For now, we check the instance creation of WhisperTranscription
			expect(MockWhisperTranscription).toHaveBeenCalledTimes(1);
		});
	});
});
