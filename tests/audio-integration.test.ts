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
});
