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
})) as unknown as typeof Audio;

global.URL.createObjectURL = jest.fn();

describe("SessionDetailView XSS Vulnerability", () => {
	let container: HTMLElement;
	let storage: IndexedDBWrapper;
	let session: Session;
	let onBack: jest.Mock;
	let mockAudioManager: jest.Mocked<LocalAudioManager>;

	const XSS_PAYLOAD = '<img src="x" onerror="window.xssCaptured=true">';

	beforeEach(() => {
		container = document.createElement("div");
		storage = new IndexedDBWrapper();
		onBack = jest.fn();
		(window as unknown as { xssCaptured: boolean }).xssCaptured = false;

		session = {
			id: "session_1",
			userId: "user_1",
			title: "Safe Title",
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
		} as Session;

		mockAudioManager = {
			getAudioFilesBySession: jest.fn().mockResolvedValue([]),
		} as unknown as jest.Mocked<LocalAudioManager>;
		(LocalAudioManager as jest.Mock).mockImplementation(() => mockAudioManager);

		jest.clearAllMocks();
	});

	test("should not execute scripts in session title during initial render", () => {
		session.title = XSS_PAYLOAD;
		new SessionDetailView(container, session, storage, onBack);

		const titleEl = container.querySelector("#session-title-text");
		expect(titleEl?.innerHTML).not.toContain('<img src="x"');
		expect((window as unknown as { xssCaptured: boolean }).xssCaptured).toBe(
			false,
		);
	});

	test("should not execute scripts in transcript segments", () => {
		session.transcript = [
			{
				start: 0,
				end: 1000,
				text: XSS_PAYLOAD,
				confidence: 0.9,
				isFinal: true,
			},
		];
		new SessionDetailView(container, session, storage, onBack);

		const segmentTextEl = container.querySelector(".segment-text");
		expect(segmentTextEl?.innerHTML).not.toContain('<img src="x"');
		expect((window as unknown as { xssCaptured: boolean }).xssCaptured).toBe(
			false,
		);
	});

	test("should not execute scripts when renaming session", async () => {
		// Mock prompt to return XSS payload
		const originalPrompt = window.prompt;
		window.prompt = jest.fn().mockReturnValue(XSS_PAYLOAD);

		new SessionDetailView(container, session, storage, onBack);

		const titleText = container.querySelector(
			"#session-title-text",
		) as HTMLElement;
		titleText.click(); // Trigger renameSession

		// Wait for async operations if any
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(titleText.innerHTML).not.toContain('<img src="x"');
		expect((window as unknown as { xssCaptured: boolean }).xssCaptured).toBe(
			false,
		);

		window.prompt = originalPrompt;
	});
});
