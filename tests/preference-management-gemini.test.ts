import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";
import type {
	LearningStats,
	PreferenceLearningSystem,
} from "../src/learning/preference-learning";
import type { CommentRoleType } from "../src/types/core";
import { PreferenceManagementUI } from "../src/ui/preference-management";

describe("PreferenceManagementUI Gemini Integration", () => {
	let container: HTMLElement;
	let mockLearningSystem: {
		getPersonalizedWeights: jest.Mock<
			(userId: string) => Promise<Map<CommentRoleType, number>>
		>;
		getLearningStats: jest.Mock<() => LearningStats>;
		getPreferenceRanking: jest.Mock<
			() => { most: CommentRoleType; least: CommentRoleType } | null
		>;
		resetPreferences: jest.Mock<(userId: string) => Promise<void>>;
	};

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);

		mockLearningSystem = {
			getPersonalizedWeights: jest
				.fn<(userId: string) => Promise<Map<CommentRoleType, number>>>()
				.mockImplementation(() => Promise.resolve(new Map())),
			getLearningStats: jest
				.fn<() => LearningStats>()
				.mockImplementation(() => ({
					totalFeedbackEvents: 0,
					averageWeight: 1.0,
					roleAdjustments: new Map(),
					mostPreferredRole: "reaction",
					leastPreferredRole: "reaction",
				})),
			getPreferenceRanking: jest
				.fn<() => { most: CommentRoleType; least: CommentRoleType } | null>()
				.mockImplementation(() => ({
					most: "greeting",
					least: "departure",
				})),
			resetPreferences: jest
				.fn<(userId: string) => Promise<void>>()
				.mockImplementation(() => Promise.resolve()),
		};

		new PreferenceManagementUI(
			container,
			mockLearningSystem as unknown as PreferenceLearningSystem,
		);

		// Clear localStorage before each test
		localStorage.clear();
	});

	afterEach(() => {
		document.body.removeChild(container);
	});

	it("should display Gemini API key input field", () => {
		expect(container.innerHTML).toContain("Gemini API Key");
		const input = container.querySelector("#geminiApiKey") as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.type).toBe("password");
	});

	it("should save Gemini API key to localStorage when changed", () => {
		const input = container.querySelector("#geminiApiKey") as HTMLInputElement;
		input.value = "test-api-key";

		// Dispatch change event
		input.dispatchEvent(new Event("change"));

		expect(localStorage.getItem("GEMINI_API_KEY")).toBe("test-api-key");
	});

	it("should load existing API key from localStorage on initialization", () => {
		localStorage.setItem("GEMINI_API_KEY", "existing-key");

		// Create new UI to trigger initialization
		const newContainer = document.createElement("div");
		new PreferenceManagementUI(
			newContainer,
			mockLearningSystem as unknown as PreferenceLearningSystem,
		);

		const input = newContainer.querySelector(
			"#geminiApiKey",
		) as HTMLInputElement;
		expect(input.value).toBe("existing-key");
	});
});
