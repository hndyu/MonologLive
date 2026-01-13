import { MonologLiveApp } from "../src/main";

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

	beforeEach(() => {
		app = new MonologLiveApp();
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
		await (app as any).startSession();

		expect(startSpy).toHaveBeenCalled();
	});

	it("should stop recording and save file when session stops", async () => {
		await app.initialize();
		const audioRecorder = app.getAudioRecorder();
		const audioManager = app.getAudioManager();

		const mockAudioFile = {
			id: "test-audio-id",
			sessionId: "",
			filename: "test.webm",
			format: "webm",
			duration: 10,
			size: 1024,
			createdAt: new Date(),
			blob: new Blob(["test data"], { type: "audio/webm" }),
		};

		const stopSpy = jest
			.spyOn(audioRecorder, "stopRecording")
			.mockResolvedValue(mockAudioFile as any);
		const saveSpy = jest
			.spyOn(audioManager, "saveAudioFile")
			.mockResolvedValue("test-audio-id");

		// Start session first
		await (app as any).startSession();
		// Stop session
		await (app as any).stopSession();

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

		const mockAudioFile = { id: "id", blob: new Blob() };
		jest
			.spyOn((app as any).audioRecorder, "stopRecording")
			.mockResolvedValue(mockAudioFile as any);
		jest
			.spyOn((app as any).audioManager, "saveAudioFile")
			.mockResolvedValue("id");

		// Start and Stop
		await (app as any).startSession();
		await (app as any).stopSession();

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
		const mockAudioFile = { id: "test-session", blob: new Blob() };
		(app as any).currentSessionId = "test-session";

		jest
			.spyOn((app as any).audioManager, "getAudioFilesBySession")
			.mockResolvedValue([mockAudioFile]);
		jest.spyOn((app as any).whisper, "isAvailable").mockReturnValue(true);
		const transcribeSpy = jest
			.spyOn((app as any).whisper, "transcribeAudio")
			.mockResolvedValue({
				text: "Hello from Whisper",
				language: "en",
				duration: 1.0,
				segments: [],
			});
		const displaySpy = jest.spyOn(
			(app as any).transcriptionDisplay,
			"addTranscript",
		);

		// Run
		await (app as any).runEnhancedTranscription();

		expect(transcribeSpy).toHaveBeenCalledWith(mockAudioFile);
		expect(displaySpy).toHaveBeenCalledWith(
			expect.stringContaining("✨ [Enhanced] Hello from Whisper"),
			true,
		);
		expect(document.getElementById("status-text")?.textContent).toBe(
			"Transcription complete!",
		);
	});
});
