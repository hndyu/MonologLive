import { LocalAudioManager } from "../src/audio/audio-manager";
import { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import type { Session } from "../src/types/core";
import { SessionDetailView } from "../src/ui/session-detail";

// Mock dependencies
jest.mock("../src/storage/indexeddb-wrapper");
jest.mock("../src/audio/audio-manager");

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
	let mockAudioManager: jest.Mocked<LocalAudioManager>;

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

		mockAudioManager = {
			getAudioFilesBySession: jest.fn().mockResolvedValue([]),
		} as any;
		(LocalAudioManager as jest.Mock).mockImplementation(() => mockAudioManager);

		jest.clearAllMocks();
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

	test("should load audio when session has audio files", async () => {
		const mockBlob = new Blob(["test-audio"], { type: "audio/webm" });
		const mockAudioFile = {
			id: "audio_1",
			sessionId: "session_1",
			blob: mockBlob,
			format: "webm",
		};

		mockAudioManager.getAudioFilesBySession.mockResolvedValue([
			mockAudioFile,
		] as any);

		new SessionDetailView(container, session, storage, onBack);

		// Wait for async loadAudio to complete
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(mockAudioManager.getAudioFilesBySession).toHaveBeenCalledWith(
			"session_1",
		);
		expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
		expect(global.Audio).toHaveBeenCalled();
	});

	test("should not load audio when session has no audio files", async () => {
		mockAudioManager.getAudioFilesBySession.mockResolvedValue([]);

		new SessionDetailView(container, session, storage, onBack);

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(mockAudioManager.getAudioFilesBySession).toHaveBeenCalledWith(
			"session_1",
		);
		expect(global.URL.createObjectURL).not.toHaveBeenCalled();
	});

	test("should export audio when session has audio files", async () => {
		const mockBlob = new Blob(["test-audio"], { type: "audio/webm" });
		const mockAudioFile = {
			id: "audio_1",
			sessionId: "session_1",
			blob: mockBlob,
			format: "webm",
		};

		mockAudioManager.getAudioFilesBySession.mockResolvedValue([
			mockAudioFile,
		] as any);

		const view = new SessionDetailView(container, session, storage, onBack);

		// Wait for initial loadAudio
		await new Promise((resolve) => setTimeout(resolve, 0));

		// Call private method directly for testing
		// biome-ignore lint/suspicious/noExplicitAny: Testing private method
		await (view as any).exportAudio();

		expect(mockAudioManager.getAudioFilesBySession).toHaveBeenCalledWith(
			"session_1",
		);
		expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
	});
});
