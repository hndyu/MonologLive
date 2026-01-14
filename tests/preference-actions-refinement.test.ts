// @ts-nocheck
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";
import { PreferenceManagementUI } from "../src/ui/preference-management";

describe("PreferenceManagementUI Actions Refinement", () => {
	let container: HTMLElement;
	let mockLearningSystem: {
		getPersonalizedWeights: jest.Mock<any>;
		getLearningStats: jest.Mock<any>;
		getPreferenceRanking: jest.Mock<any>;
		resetPreferences: jest.Mock<any>;
	};

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
	});

	afterEach(() => {
		document.body.removeChild(container);
		jest.clearAllMocks();
	});

	it("should NOT display Refresh button", () => {
		const refreshBtn = container.querySelector("#refreshData");
		expect(refreshBtn).toBeNull();
	});

	it("should position Reset button before AI Settings heading", () => {
		const resetBtn = container.querySelector("#resetPreferences");
		const aiSettings = container.querySelector(".ai-settings");

		expect(resetBtn).not.toBeNull();
		expect(aiSettings).not.toBeNull();

		// Check if it's no longer in .preference-actions
		const actionsContainer = container.querySelector(".preference-actions");
		expect(actionsContainer).toBeNull();

		// Check relative position: resetBtn should come before aiSettings
		const allElements = Array.from(container.querySelectorAll("*"));
		const resetIdx = allElements.indexOf(resetBtn);
		const aiSettingsIdx = allElements.indexOf(aiSettings);

		expect(resetIdx).toBeLessThan(aiSettingsIdx);
		expect(resetIdx).not.toBe(-1);
		expect(aiSettingsIdx).not.toBe(-1);
	});
	it("should have a subtle style for Reset button (not reset-btn)", () => {
		const resetBtn = container.querySelector("#resetPreferences");
		expect(resetBtn.classList.contains("reset-btn")).toBe(false);
		expect(resetBtn.classList.contains("subtle-reset-btn")).toBe(true);
	});

	it("should call resetPreferences when Reset button is clicked and confirmed", async () => {
		// Mock window.confirm
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

		const ui = new PreferenceManagementUI(container, mockLearningSystem);
		ui.setUser("test-user");

		const resetBtn = container.querySelector("#resetPreferences");
		resetBtn.click();

		// Need to wait for async handleReset
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(confirmSpy).toHaveBeenCalled();
		expect(mockLearningSystem.resetPreferences).toHaveBeenCalledWith(
			"test-user",
		);

		confirmSpy.mockRestore();
	});
});
