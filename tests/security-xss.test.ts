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

import type { PreferenceLearningSystem } from "../src/learning/preference-learning";
import { PreferenceManagementUI } from "../src/ui/preference-management";

jest.mock("../src/learning/preference-learning");

describe("PreferenceManagementUI XSS Vulnerability", () => {
	let container: HTMLElement;
	let mockPreferenceLearning: jest.Mocked<PreferenceLearningSystem>;
	const XSS_PAYLOAD = '"><img src="x" onerror="window.xssCaptured=true">';

	beforeEach(() => {
		container = document.createElement("div");
		(window as unknown as { xssCaptured: boolean }).xssCaptured = false;

		mockPreferenceLearning = {
			getPersonalizedWeights: jest.fn().mockResolvedValue(new Map()),
			getLearningStats: jest.fn().mockReturnValue({
				totalFeedbackEvents: 0,
				roleAdjustments: new Map(),
				averageWeight: 1.0,
				mostPreferredRole: "reaction",
				leastPreferredRole: "reaction",
			}),
			getPreferenceRanking: jest.fn().mockReturnValue({
				most: "reaction",
				least: "reaction",
			}),
		} as unknown as jest.Mocked<PreferenceLearningSystem>;

		localStorage.clear();
		jest.clearAllMocks();
	});

	test("should not execute scripts from localStorage API key", () => {
		localStorage.setItem("GEMINI_API_KEY", XSS_PAYLOAD);

		new PreferenceManagementUI(container, mockPreferenceLearning);

		const apiKeyInput = container.querySelector(
			"#geminiApiKey",
		) as HTMLInputElement;
		// If vulnerable, the innerHTML assignment will execute the script
		// and the input value might be mangled or the script already run.
		expect(apiKeyInput.value).toBe(XSS_PAYLOAD);
		expect((window as unknown as { xssCaptured: boolean }).xssCaptured).toBe(
			false,
		);
	});
});

import { SessionHistoryManager } from "../src/session/session-history-manager";

import { HistoryModal } from "../src/ui/history-modal";

jest.mock("../src/session/session-history-manager");

describe("HistoryModal XSS Vulnerability", () => {
	let container: HTMLElement;
	let storage: IndexedDBWrapper;
	let mockHistoryManager: jest.Mocked<SessionHistoryManager>;
	const XSS_PAYLOAD = '<img src="x" onerror="window.xssCaptured=true">';

	beforeEach(() => {
		container = document.createElement("div");
		storage = new IndexedDBWrapper();
		(window as unknown as { xssCaptured: boolean }).xssCaptured = false;

		mockHistoryManager = {
			getSessions: jest.fn().mockResolvedValue([
				{
					id: "session_1",
					userId: "user_1",
					title: XSS_PAYLOAD,
					startTime: new Date(),
					metrics: { totalDuration: 0, commentCount: 0 },
					transcript: [],
					comments: [],
					interactions: [],
				},
			]),
		} as unknown as jest.Mocked<SessionHistoryManager>;
		(SessionHistoryManager as jest.Mock).mockImplementation(
			() => mockHistoryManager,
		);

		jest.clearAllMocks();
	});

	test("should not execute scripts in session list titles", async () => {
		const modal = new HistoryModal(container, storage);
		await modal.refresh();

		const titleEl = container.querySelector(".session-title");
		expect(titleEl?.innerHTML).not.toContain('<img src="x"');
		expect((window as unknown as { xssCaptured: boolean }).xssCaptured).toBe(
			false,
		);
	});
});
