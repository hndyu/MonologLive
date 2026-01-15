import { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import { HistoryModal } from "../src/ui/history-modal";

// Mock dependencies
jest.mock("../src/storage/indexeddb-wrapper");
jest.mock("../src/session/session-history-manager", () => {
	return {
		SessionHistoryManager: jest.fn().mockImplementation(() => ({
			getSessions: jest.fn().mockResolvedValue([
				{
					id: "session_1",
					userId: "default_user",
					title: "Test Session 1",
					startTime: new Date("2023-01-01T10:00:00"),
					endTime: new Date("2023-01-01T10:10:00"),
					metrics: { totalDuration: 600000, commentCount: 5 },
					transcript: [],
					comments: [],
					interactions: [],
					isFavorite: false,
				},
				{
					id: "session_2",
					userId: "default_user",
					title: "Test Session 2",
					startTime: new Date("2023-01-02T10:00:00"),
					endTime: new Date("2023-01-02T10:05:00"),
					metrics: { totalDuration: 300000, commentCount: 2 },
					transcript: [],
					comments: [],
					interactions: [],
					isFavorite: true,
				},
			]),
		})),
	};
});

describe("HistoryModal", () => {
	let container: HTMLElement;
	let storage: IndexedDBWrapper;
	let modal: HistoryModal;

	beforeEach(() => {
		container = document.createElement("div");
		storage = new IndexedDBWrapper();
		modal = new HistoryModal(container, storage);
	});

	test("should render initial structure", () => {
		expect(container.querySelector(".history-modal-content")).toBeTruthy();
		expect(container.querySelector("#history-search")).toBeTruthy();
		expect(container.querySelector("#history-favorite-filter")).toBeTruthy();
		expect(container.querySelector("#session-list")).toBeTruthy();
	});

	test("should render sessions list on refresh", async () => {
		await modal.refresh();

		const list = container.querySelector("#session-list");
		expect(list?.children.length).toBe(2);

		const firstItem = list?.children[0]; // Should be session 2 (newer date)
		expect(firstItem?.innerHTML).toContain("Test Session 2");
		expect(firstItem?.innerHTML).toContain("★"); // Favorite

		const secondItem = list?.children[1];
		expect(secondItem?.innerHTML).toContain("Test Session 1");
		expect(secondItem?.innerHTML).toContain("☆"); // Not favorite
	});
});
