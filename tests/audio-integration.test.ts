import type { LocalAudioManager } from "../src/audio/audio-manager";
import type { WebAudioRecorder } from "../src/audio/audio-recorder";
import { MonologLiveApp } from "../src/main";
import type { WhisperTranscription } from "../src/transcription/enhanced-transcription";
import type { AudioFile } from "../src/types/core";
import type { TranscriptionDisplay } from "../src/ui/transcription-display";

// Interface to access private members for testing
interface PrivateMonologLiveApp {
	startSession(): Promise<void>;
	stopSession(): Promise<void>;
	runEnhancedTranscription(): Promise<void>;
	audioRecorder: WebAudioRecorder;
	audioManager: LocalAudioManager;
	whisper: WhisperTranscription;
	transcriptionDisplay: TranscriptionDisplay;
	currentSessionId: string | null;
}

// Mock DOM elements required for initialization
document.body.innerHTML = `
  <div id="transcription-mount"></div>
  <div id="comment-mount"></div>
  <div id="topic-mount"></div>
  <div id="preferences-mount"></div>
  <button id="start-btn"></button>
  <button id="stop-btn"></button>
  <button id="preferences-btn"></button>
  <button id="close-preferences"></button>
  <div id="preferences-modal"></div>
  <div id="status-text"></div>
  <div id="status-indicator"></div>
`;

describe("MonologLiveApp Audio Integration", () => {
	let app: MonologLiveApp;
	let privateApp: PrivateMonologLiveApp;

	beforeEach(() => {
		app = new MonologLiveApp();
		privateApp = app as unknown as PrivateMonologLiveApp;
	});

	it("should instantiate LocalAudioManager and WebAudioRecorder", async () => {
		await app.initialize();

		// Use public getters
		const audioManager = app.getAudioManager();
		const audioRecorder = app.getAudioRecorder();
		const whisper = app.getWhisper();

		expect(audioManager).toBeDefined();
		expect(audioRecorder).toBeDefined();
		expect(whisper).toBeDefined();
		// We verify they are defined. Checking exact class names might be flaky if mangled,
		// but verifying they are objects with expected methods is good.
		expect(typeof audioManager.saveAudioFile).toBe("function");
		expect(typeof audioRecorder.startRecording).toBe("function");
		expect(typeof whisper.transcribeAudio).toBe("function");
	});

	it("should start recording when session starts", async () => {
		await app.initialize();
		const audioRecorder = app.getAudioRecorder();
		const startSpy = jest.spyOn(audioRecorder, "startRecording");

		// Access private method for testing session start
		await privateApp.startSession();

		expect(startSpy).toHaveBeenCalled();
	});

	it("should stop recording and save file when session stops", async () => {
		await app.initialize();
		const audioRecorder = app.getAudioRecorder();
		const audioManager = app.getAudioManager();

		const mockAudioFile: AudioFile = {
			id: "test-audio-id",
			sessionId: "",
			filename: "test.webm",
			format: "webm",
			duration: 10,
			size: 1024,
			createdAt: new Date(),
			blob: new Blob(["test data"], { type: "audio/webm" }),
			quality: {
				bitrate: 128000,
				sampleRate: 44100,
				channels: 1,
			},
		};

		const stopSpy = jest
			.spyOn(audioRecorder, "stopRecording")
			.mockResolvedValue(mockAudioFile);
		const saveSpy = jest
			.spyOn(audioManager, "saveAudioFile")
			.mockResolvedValue("test-audio-id");

		// Start session first
		await privateApp.startSession();
		// Stop session
		await privateApp.stopSession();

		expect(stopSpy).toHaveBeenCalled();
		expect(saveSpy).toHaveBeenCalledWith(
			expect.objectContaining({ id: "test-audio-id" }),
			expect.any(String),
		);
	});

	it("should show 'Run Enhanced Transcription' button when session ends", async () => {
		// Mock DOM for the button
		document.body.innerHTML +=
			'<button id="enhanced-transcribe-btn" style="display: none;"></button>';

		await app.initialize();

		const mockAudioFile: AudioFile = {
			id: "id",
			sessionId: "",
			filename: "test.webm",
			format: "webm",
			duration: 1,
			size: 100,
			createdAt: new Date(),
			blob: new Blob(),
			quality: { bitrate: 128000, sampleRate: 44100, channels: 1 },
		};
		jest
			.spyOn(privateApp.audioRecorder, "stopRecording")
			.mockResolvedValue(mockAudioFile);
		jest
			.spyOn(privateApp.audioManager, "saveAudioFile")
			.mockResolvedValue("id");

		// Start and Stop
		await privateApp.startSession();
		await privateApp.stopSession();

		const btn = document.getElementById("enhanced-transcribe-btn");
		expect(btn?.style.display).not.toBe("none");
	});

	it("should run enhanced transcription and update display", async () => {
		document.body.innerHTML += `
			<button id="enhanced-transcribe-btn"></button>
			<span id="status-text"></span>
			<div id="transcription-mount"></div>
		`;

		await app.initialize();

		// Mock components
		const mockAudioFile: AudioFile = {
			id: "test-session",
			sessionId: "test-session",
			filename: "test.webm",
			format: "webm",
			duration: 1,
			size: 100,
			createdAt: new Date(),
			blob: new Blob(),
			quality: { bitrate: 128000, sampleRate: 44100, channels: 1 },
		};
		privateApp.currentSessionId = "test-session";

		jest
			.spyOn(privateApp.audioManager, "getAudioFilesBySession")
			.mockResolvedValue([mockAudioFile]);
		jest.spyOn(privateApp.whisper, "isAvailable").mockReturnValue(true);

		const summaryGenerator = app.getSummaryGenerator();
		const transcribeSpy = jest
			.spyOn(summaryGenerator, "enhanceTranscript")
			.mockResolvedValue("Hello from Whisper");

		const displaySpy = jest.spyOn(
			privateApp.transcriptionDisplay,
			"addTranscript",
		);

		// Run
		await privateApp.runEnhancedTranscription();

		expect(transcribeSpy).toHaveBeenCalledWith(
			expect.any(String),
			mockAudioFile,
		);
		expect(displaySpy).toHaveBeenCalledWith(
			expect.stringContaining("✨ [Enhanced] Hello from Whisper"),
			true,
		);
		expect(document.getElementById("status-text")?.textContent).toBe(
			"Transcription complete!",
		);
	});
});
