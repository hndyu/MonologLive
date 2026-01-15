import { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import type { Session } from "../src/types/core";
import { SessionDetailView } from "../src/ui/session-detail";

// Mock dependencies
jest.mock("../src/storage/indexeddb-wrapper");
jest.mock("../src/audio/audio-manager", () => {
	return {
		LocalAudioManager: jest.fn().mockImplementation(() => ({
			getAudioFilesBySession: jest.fn().mockResolvedValue([]),
		})),
	};
});

// Mock HTML5 Audio
global.Audio = jest.fn().mockImplementation(() => ({
	play: jest.fn(),
	pause: jest.fn(),
	addEventListener: jest.fn(),
	removeEventListener: jest.fn(),
	currentTime: 0,
	duration: 100,
	// biome-ignore lint/suspicious/noExplicitAny: Mocking HTML5 Audio
})) as unknown as any;

global.URL.createObjectURL = jest.fn();

describe("SessionDetailView", () => {
	let container: HTMLElement;
	let storage: IndexedDBWrapper;
	let session: Session;
	let onBack: jest.Mock;

	beforeEach(() => {
		container = document.createElement("div");
		storage = new IndexedDBWrapper();
		onBack = jest.fn();
		session = {
			id: "session_1",
			userId: "user_1",
			title: "Test Session",
			startTime: new Date(),
			transcript: [],
			comments: [],
			interactions: [],
			metrics: { totalDuration: 0, commentCount: 0 },
			// biome-ignore lint/suspicious/noExplicitAny: Mocking session object
		} as unknown as any;
	});

	test("should render session details", () => {
		new SessionDetailView(container, session, storage, onBack);

		expect(container.querySelector(".detail-title")).toBeTruthy();
		expect(container.innerHTML).toContain("Test Session");
		expect(container.querySelector("#play-pause-btn")).toBeTruthy();
	});

	test("should call onBack when back button is clicked", () => {
		new SessionDetailView(container, session, storage, onBack);

		const backBtn = container.querySelector("#detail-back-btn") as HTMLElement;
		backBtn.click();

		expect(onBack).toHaveBeenCalled();
	});
});
