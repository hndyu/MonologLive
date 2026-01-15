import { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import type { Session, TranscriptSegment } from "../src/types/core";

describe("Transcript Editing", () => {
	let storage: IndexedDBWrapper;
	const sessionId = "test-session";
	const userId = "test-user";

	beforeEach(async () => {
		storage = new IndexedDBWrapper();
		await storage.initialize();

		const initialSession: Session = {
			id: sessionId,
			userId,
			startTime: new Date(),
			transcript: [
				{
					start: 0,
					end: 1000,
					text: "Original text",
					confidence: 1.0,
					isFinal: true,
				},
			],
			comments: [],
			interactions: [],
			metrics: {
				totalDuration: 1000,
				commentCount: 0,
				interactionCount: 0,
				averageEngagement: 0,
			},
		};

		await storage.saveSession(initialSession);
	});

	test("should update session transcript", async () => {
		const newTranscript: TranscriptSegment[] = [
			{
				start: 0,
				end: 1000,
				text: "Updated text",
				confidence: 1.0,
				isFinal: true,
			},
		];

		await storage.updateSessionTranscript(sessionId, newTranscript);

		const updatedSession = await storage.getSession(sessionId);
		expect(updatedSession?.transcript[0].text).toBe("Updated text");
	});

	test("should handle missing session gracefully", async () => {
		const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
		await storage.updateSessionTranscript("non-existent", []);
		expect(consoleSpy).toHaveBeenCalledWith("Session non-existent not found");
		consoleSpy.mockRestore();
	});
});
