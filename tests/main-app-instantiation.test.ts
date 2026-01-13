import { MonologLiveApp } from "../src/main";
import { SessionManagerImpl } from "../src/session/session-manager";
import { TopicManager } from "../src/session/topic-manager";
import { SummaryGeneratorImpl } from "../src/summary/summary-generator";

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

describe("MonologLiveApp Instantiation", () => {
	let app: MonologLiveApp;

	beforeEach(() => {
		app = new MonologLiveApp();
	});

	it("should instantiate SummaryGenerator with dependencies", async () => {
		await app.initialize();

		// Use public getter
		const summaryGenerator = app.getSummaryGenerator();

		expect(summaryGenerator).toBeDefined();
		expect(summaryGenerator).toBeInstanceOf(SummaryGeneratorImpl);
	});

	it("should instantiate SessionManager and TopicManager", async () => {
		await app.initialize();

		// Use public getters
		const sessionManager = app.getSessionManager();
		const topicManager = app.getTopicManager();

		expect(sessionManager).toBeDefined();
		expect(sessionManager).toBeInstanceOf(SessionManagerImpl);

		expect(topicManager).toBeDefined();
		expect(topicManager).toBeInstanceOf(TopicManager);
	});

	it("should update status to ready after initialization", async () => {
		await app.initialize();

		const statusText = document.getElementById("status-text");
		const statusIndicator = document.getElementById("status-indicator");

		expect(statusText?.textContent).toBe("System ready");
		expect(statusIndicator?.className).toBe("ready");
	});
});
