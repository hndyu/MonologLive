import { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import type { Session } from "../src/types/core";

describe("Session Metadata", () => {
	let wrapper: IndexedDBWrapper;

	beforeEach(() => {
		wrapper = new IndexedDBWrapper();
	});

	test("Session interface should support title and isFavorite", () => {
		const session: Session = {
			id: "test-session",
			userId: "user-1",
			startTime: new Date(),
			transcript: [],
			comments: [],
			interactions: [],
			metrics: {
				totalDuration: 0,
				commentCount: 0,
				interactionCount: 0,
				averageEngagement: 0,
			},
			title: "My Session",
			isFavorite: true,
		};

		expect(session.title).toBe("My Session");
		expect(session.isFavorite).toBe(true);
	});

	test("should have updateSessionMetadata method", async () => {
		expect(typeof wrapper.updateSessionMetadata).toBe("function");
	});
});
