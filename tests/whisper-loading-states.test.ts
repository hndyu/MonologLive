import { WhisperTranscription } from "../src/transcription/enhanced-transcription";

// Mock the transformers library
jest.mock("@huggingface/transformers", () => ({
	pipeline: jest.fn(),
}));

import { pipeline } from "@huggingface/transformers";

describe("Whisper Loading States", () => {
	let whisper: WhisperTranscription;

	beforeEach(() => {
		jest.clearAllMocks();
		whisper = new WhisperTranscription({ modelSize: "tiny" });
	});

	test("Initial status should be idle", () => {
		const info = whisper.getModelInfo();
		expect(info.status).toBe("idle");
		expect(info.isLoaded).toBe(false);
		expect(info.error).toBeUndefined();
	});

	test("Status should be loading while model is being loaded", async () => {
		// Mock pipeline to take some time
		let resolvePipeline: (value: unknown) => void = () => {};
		const pipelinePromise = new Promise((resolve) => {
			resolvePipeline = resolve;
		});
		(pipeline as jest.Mock).mockReturnValue(pipelinePromise);

		const loadPromise = whisper.loadModel();

		const info = whisper.getModelInfo();
		expect(info.status).toBe("loading");

		// Finish loading
		resolvePipeline(() => Promise.resolve({ text: "" }));
		await loadPromise;

		const finalInfo = whisper.getModelInfo();
		expect(finalInfo.status).toBe("loaded");
		expect(finalInfo.isLoaded).toBe(true);
	});

	test("Status should be error if loading fails", async () => {
		(pipeline as jest.Mock).mockRejectedValue(new Error("Network error"));

		await whisper.loadModel();

		const info = whisper.getModelInfo();
		expect(info.status).toBe("error");
		expect(info.isLoaded).toBe(false);
		expect(info.error).toBe("Network error");
	});
});
