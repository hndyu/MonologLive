import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";
import type { PreferenceLearningSystem } from "../src/learning/preference-learning";
import { PreferenceManagementUI } from "../src/ui/preference-management";

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

	it("should save preload setting to localStorage when changed", () => {
		new PreferenceManagementUI(
			container,
			mockLearningSystem as unknown as PreferenceLearningSystem,
		);
		const preloadToggle = container.querySelector(
			"#whisperPreload",
		) as HTMLInputElement;

		// Set to true
		preloadToggle.checked = true;
		preloadToggle.dispatchEvent(new Event("change"));
		expect(localStorage.getItem("WHISPER_PRELOAD_ENABLED")).toBe("true");

		// Set to false
		preloadToggle.checked = false;
		preloadToggle.dispatchEvent(new Event("change"));
		expect(localStorage.getItem("WHISPER_PRELOAD_ENABLED")).toBe("false");
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
