import { SessionManagerImpl } from "../src/session/session-manager";
import { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import {
	BasicInsightGenerator,
	BasicTopicExtractor,
	SummaryGeneratorImpl,
} from "../src/summary/summary-generator";

describe("Session Persistence", () => {
	let sessionManager: SessionManagerImpl;
	let storage: IndexedDBWrapper;
	let summaryGenerator: SummaryGeneratorImpl;

	beforeEach(async () => {
		storage = new IndexedDBWrapper();
		await storage.initialize();

		summaryGenerator = new SummaryGeneratorImpl(
			new BasicTopicExtractor(),
			new BasicInsightGenerator(),
		);

		sessionManager = new SessionManagerImpl(storage, summaryGenerator);
	});

	afterEach(async () => {
		await storage.clearAllData();
		await storage.close();
	});

	it("should persist and retrieve a session summary", async () => {
		const userId = "test-user";
		const session = sessionManager.startSession(userId, "test topic");
		const sessionId = session.id;

		// Simulate some activity
		sessionManager.addTranscriptSegment(sessionId, {
			start: 0,
			end: 1000,
			text: "Hello",
			confidence: 1.0,
			isFinal: true,
		});

		// End session and generate summary
		const summary = await sessionManager.endSession(sessionId);

		// Retrieve summary via SessionManager (this method needs to be added)
		const retrievedSummary = await sessionManager.getSummary(sessionId);

		expect(retrievedSummary).toBeDefined();
		expect(retrievedSummary?.sessionId).toBe(sessionId);
		expect(retrievedSummary?.overallSummary).toBe(summary.overallSummary);
	});
});
