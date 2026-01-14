// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PreferenceManagementUI } from "../src/ui/preference-management";

describe("PreferenceManagementUI Gemini Integration", () => {
	let container: HTMLElement;
	let mockLearningSystem: PreferenceLearningSystem;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);

		mockLearningSystem = {
			getPersonalizedWeights: jest.fn().mockResolvedValue(new Map()),
			getLearningStats: jest
				.fn()
				.mockReturnValue({ totalFeedbackEvents: 0, averageWeight: 1.0 }),
			getPreferenceRanking: jest
				.fn()
				.mockReturnValue({ most: "greeting", least: "departure" }),
			resetPreferences: jest.fn().mockResolvedValue(undefined),
		};

		new PreferenceManagementUI(container, mockLearningSystem);

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
		new PreferenceManagementUI(newContainer, mockLearningSystem);

		const input = newContainer.querySelector(
			"#geminiApiKey",
		) as HTMLInputElement;
		expect(input.value).toBe("existing-key");
	});
});
