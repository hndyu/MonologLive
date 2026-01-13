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
	});
});
