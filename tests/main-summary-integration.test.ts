import { MonologLiveApp } from "../src/main";
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

describe("MonologLiveApp Summary Integration", () => {
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
});
