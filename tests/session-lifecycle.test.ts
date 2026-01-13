import { MonologLiveApp } from "../src/main";

// Mock DOM elements required for initialization
document.body.innerHTML = `
  <div id="transcription-mount"></div>
  <div id="comment-mount"></div>
  <div id="topic-mount"></div>
  <div id="preferences-mount"></div>
  <button id="start-btn"></button>
  <button id="stop-btn"></button>
  <button id="enhanced-transcribe-btn"></button>
  <button id="preferences-btn"></button>
  <button id="close-preferences"></button>
  <div id="preferences-modal"></div>
  <div id="status-text"></div>
  <div id="status-indicator"></div>
`;

describe("Session Lifecycle Integration", () => {
	let app: MonologLiveApp;

	beforeEach(async () => {
		app = new MonologLiveApp();
		await app.initialize();
	});

	it("should call sessionManager.startSession when startSession is called", async () => {
		const sessionManager = app.getSessionManager();
		const startSessionSpy = jest.spyOn(sessionManager, "startSession");

		// @ts-expect-error - access private method for testing
		await app.startSession();

		expect(startSessionSpy).toHaveBeenCalledWith(
			"default_user",
			expect.any(String),
		);
	});

	it("should set isRunning to true and update UI when session starts", async () => {
		// @ts-expect-error - access private method
		await app.startSession();

		// @ts-expect-error - access private property
		expect(app.isRunning).toBe(true);

		const startBtn = document.getElementById("start-btn") as HTMLButtonElement;
		const stopBtn = document.getElementById("stop-btn") as HTMLButtonElement;
		expect(startBtn.disabled).toBe(true);
		expect(stopBtn.disabled).toBe(false);

		const statusText = document.getElementById("status-text");
		const statusIndicator = document.getElementById("status-indicator");
		expect(statusText?.textContent).toBe("Recording active - Speak naturally");
		expect(statusIndicator?.className).toBe("running");
	});

	it("should call sessionManager.endSession when stopSession is called", async () => {
		const sessionManager = app.getSessionManager();
		const endSessionSpy = jest.spyOn(sessionManager, "endSession");

		// Start session first
		// @ts-expect-error
		await app.startSession();
		// @ts-expect-error
		const sessionId = app.currentSessionId;

		// @ts-expect-error
		await app.stopSession();

		expect(endSessionSpy).toHaveBeenCalledWith(sessionId);
	});

	it("should set isRunning to false and reset currentSessionId when session stops", async () => {
		// @ts-expect-error
		await app.startSession();
		// @ts-expect-error
		await app.stopSession();

		// @ts-expect-error
		expect(app.isRunning).toBe(false);
		// @ts-expect-error
		expect(app.currentSessionId).toBeNull();

		const startBtn = document.getElementById("start-btn") as HTMLButtonElement;
		const stopBtn = document.getElementById("stop-btn") as HTMLButtonElement;
		expect(startBtn.disabled).toBe(false);
		expect(stopBtn.disabled).toBe(true);

		const statusText = document.getElementById("status-text");
		const statusIndicator = document.getElementById("status-indicator");
		expect(statusText?.textContent).toBe("Session ended");
		expect(statusIndicator?.className).toBe("ready");
	});
});
