import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";
import type { PreferenceLearningSystem } from "../src/learning/preference-learning";
import { lazyLoader } from "../src/performance/index";
import { PreferenceManagementUI } from "../src/ui/preference-management";

// Mock lazyLoader
jest.mock("../src/performance/index", () => ({
	lazyLoader: {
		loadFeature: jest.fn().mockImplementation(() => Promise.resolve()),
	},
}));

describe("PreferenceManagementUI Performance Settings", () => {
	let container: HTMLElement;
	// biome-ignore lint/suspicious/noExplicitAny: Mocking complex interface for testing
	let mockLearningSystem: any;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);

		mockLearningSystem = {
			getPersonalizedWeights: jest
				.fn()
				.mockImplementation(() => Promise.resolve(new Map())),
			getLearningStats: jest.fn().mockImplementation(() => ({
				totalFeedbackEvents: 0,
				averageWeight: 1.0,
				roleAdjustments: new Map(),
				mostPreferredRole: "reaction",
				leastPreferredRole: "reaction",
			})),
			getPreferenceRanking: jest.fn().mockImplementation(() => ({
				most: "greeting",
				least: "departure",
			})),
			resetPreferences: jest.fn().mockImplementation(() => Promise.resolve()),
		};

		// Clear localStorage before each test
		localStorage.clear();
		jest.clearAllMocks();
	});

	afterEach(() => {
		document.body.removeChild(container);
	});

	it("should display Performance Settings section", () => {
		new PreferenceManagementUI(
			container,
			mockLearningSystem as unknown as PreferenceLearningSystem,
		);
		expect(container.innerHTML).toContain("Performance Settings");
	});

	it("should display Background Pre-load toggle", () => {
		new PreferenceManagementUI(
			container,
			mockLearningSystem as unknown as PreferenceLearningSystem,
		);
		const preloadToggle = container.querySelector(
			"#whisperPreload",
		) as HTMLInputElement;
		expect(preloadToggle).not.toBeNull();
		expect(preloadToggle.type).toBe("checkbox");
	});

	it("should save preload setting and trigger lazy load when toggled on", async () => {
		new PreferenceManagementUI(
			container,
			mockLearningSystem as unknown as PreferenceLearningSystem,
		);
		const preloadToggle = container.querySelector(
			"#whisperPreload",
		) as HTMLInputElement;

		// Set to true
		preloadToggle.checked = true;
		const changeEvent = new Event("change");
		preloadToggle.dispatchEvent(changeEvent);

		expect(localStorage.getItem("WHISPER_PRELOAD_ENABLED")).toBe("true");
		expect(lazyLoader.loadFeature).toHaveBeenCalledWith(
			"enhanced-transcription",
		);
	});

	it("should display loading status when preload starts", async () => {
		// Mock a slow load
		(lazyLoader.loadFeature as jest.Mock).mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 100)),
		);

		new PreferenceManagementUI(
			container,
			mockLearningSystem as unknown as PreferenceLearningSystem,
		);
		const preloadToggle = container.querySelector(
			"#whisperPreload",
		) as HTMLInputElement;
		const statusHint = container.querySelector(
			".performance-settings .setting-hint",
		) as HTMLElement;

		preloadToggle.checked = true;
		preloadToggle.dispatchEvent(new Event("change"));

		expect(statusHint.textContent).toContain("Loading AI library");
		expect(statusHint.classList.contains("loading")).toBe(true);
	});

	it("should load existing preload setting from localStorage on initialization", () => {
		localStorage.setItem("WHISPER_PRELOAD_ENABLED", "true");

		const newContainer = document.createElement("div");
		new PreferenceManagementUI(
			newContainer,
			mockLearningSystem as unknown as PreferenceLearningSystem,
		);

		const preloadToggle = newContainer.querySelector(
			"#whisperPreload",
		) as HTMLInputElement;
		expect(preloadToggle.checked).toBe(true);
	});
});
