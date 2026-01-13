import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MonologLiveApp } from "../src/main";

// Mock everything needed for main.ts
jest.mock("../src/audio/audio-manager");
jest.mock("../src/audio/audio-recorder");
jest.mock("../src/comment-generation/comment-system");
jest.mock("../src/session/session-manager");
jest.mock("../src/session/topic-manager");
jest.mock("../src/storage/indexeddb-wrapper");
jest.mock("../src/summary/summary-generator");
jest.mock("../src/transcription/enhanced-transcription");
jest.mock("../src/ui/preference-management");
jest.mock("../src/ui/topic-field");
jest.mock("../src/ui/transcription-display");
jest.mock("../src/voice/voice-input-manager");

describe("MonologLiveApp - Enhanced Transcription UI", () => {
	let app: MonologLiveApp;

	beforeEach(() => {
		// Setup DOM
		document.body.innerHTML = `
            <button id="start-btn"></button>
            <button id="stop-btn"></button>
            <button id="enhanced-transcribe-btn" style="display: none;"></button>
            <div id="status-text"></div>
            <div id="status-indicator"></div>
            <div id="transcription-mount"></div>
            <div id="comment-mount"></div>
            <div id="topic-mount"></div>
            <div id="preferences-mount"></div>
            <div id="summary-mount"></div>
            <div id="preferences-modal"></div>
        `;

		app = new MonologLiveApp();
	});

	it("should show enhanced transcription button after session ends if audio was saved", async () => {
		// @ts-expect-error - access private for testing
		app.isRunning = true;
		// @ts-expect-error
		app.currentSessionId = "test-session";

		const enhancedBtn = document.getElementById("enhanced-transcribe-btn");

		// Mock audio recorder to return a file
		// @ts-expect-error
		app.audioRecorder.stopRecording.mockResolvedValue(
			new Blob(["test"], { type: "audio/webm" }),
		);
		// @ts-expect-error
		app.sessionManager.endSession.mockResolvedValue({
			sessionId: "test-session",
			topics: [],
			insights: [],
			overallSummary: "Summary",
		});

		// Trigger stop session
		// @ts-expect-error
		await app.stopSession();

		expect(enhancedBtn?.style.display).toBe("flex");
	});

	it("should allow running enhanced transcription after session ends", async () => {
		// @ts-expect-error
		app.isRunning = true;
		// @ts-expect-error
		app.currentSessionId = "test-session";
		// @ts-expect-error
		app.whisper.isAvailable.mockReturnValue(true);
		// @ts-expect-error
		app.audioManager.getAudioFilesBySession.mockResolvedValue([
			{ id: "file1" },
		]);
		// @ts-expect-error
		app.whisper.transcribeAudio.mockResolvedValue({ text: "Enhanced text" });

		// Stop session
		// @ts-expect-error
		await app.stopSession();

		// Run enhanced transcription
		// @ts-expect-error
		await app.runEnhancedTranscription();

		// @ts-expect-error
		expect(app.whisper.transcribeAudio).toHaveBeenCalled();
	});
});
