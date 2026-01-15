import {
	type SessionFilter,
	SessionHistoryManager,
} from "../src/session/session-history-manager";
import { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import type { Session } from "../src/types/core";

// Mock IndexedDBWrapper
jest.mock("../src/storage/indexeddb-wrapper");

describe("SessionHistoryManager", () => {
	let manager: SessionHistoryManager;
	let mockDb: jest.Mocked<IndexedDBWrapper>;
	let mockSessions: Session[];

	const createSession = (
		id: string,
		date: Date,
		title?: string,
		isFavorite?: boolean,
		transcriptText: string = "",
	): Session => ({
		id,
		userId: "user-1",
		startTime: date,
		title,
		isFavorite,
		transcript: transcriptText
			? [
					{
						start: 0,
						end: 1,
						text: transcriptText,
						confidence: 1,
						isFinal: true,
					},
				]
			: [],
		comments: [],
		interactions: [],
		metrics: {
			totalDuration: 60,
			commentCount: 0,
			interactionCount: 0,
			averageEngagement: 0,
		},
	});

	beforeEach(() => {
		mockDb = new IndexedDBWrapper() as jest.Mocked<IndexedDBWrapper>;
		manager = new SessionHistoryManager(mockDb);

		mockSessions = [
			createSession(
				"1",
				new Date("2023-01-01"),
				"First Session",
				false,
				"hello world",
			),
			createSession(
				"2",
				new Date("2023-01-02"),
				"Second Session",
				true,
				"goodbye world",
			),
			createSession(
				"3",
				new Date("2023-01-03"),
				"Third Session",
				false,
				"hello again",
			),
		];

		mockDb.getSessionsByUser.mockResolvedValue(mockSessions);
	});

	test("should return all sessions for user if no filter provided", async () => {
		const result = await manager.getSessions({ userId: "user-1" });
		expect(result).toHaveLength(3);
		expect(mockDb.getSessionsByUser).toHaveBeenCalledWith("user-1");
	});

	test("should filter by date range", async () => {
		const filter: SessionFilter = {
			userId: "user-1",
			startDate: new Date("2023-01-02"),
			endDate: new Date("2023-01-02"),
		};
		const result = await manager.getSessions(filter);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("2");
	});

	test("should filter by favorite status", async () => {
		const result = await manager.getSessions({
			userId: "user-1",
			isFavorite: true,
		});
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("2");
	});

	test("should search in title", async () => {
		const result = await manager.getSessions({
			userId: "user-1",
			searchQuery: "Third",
		});
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("3");
	});

	test("should search in transcript", async () => {
		const result = await manager.getSessions({
			userId: "user-1",
			searchQuery: "goodbye",
		});
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("2");
	});

	test("should combine filters", async () => {
		const result = await manager.getSessions({
			userId: "user-1",
			isFavorite: false,
			searchQuery: "hello",
		});
		expect(result).toHaveLength(2); // 1 and 3 are not fav and have "hello"
		expect(result.map((s) => s.id)).toContain("1");
		expect(result.map((s) => s.id)).toContain("3");
	});
});
