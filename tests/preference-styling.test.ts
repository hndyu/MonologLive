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

describe("PreferenceManagementUI Styling", () => {
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
	});

	afterEach(() => {
		document.body.removeChild(container);
		// Clean up styles added to head
		const styles = document.head.querySelectorAll("style");
		for (const style of Array.from(styles)) {
			style.remove();
		}
		jest.clearAllMocks();
	});

	it("should apply subtle styles to Reset button", () => {
		new PreferenceManagementUI(container, mockLearningSystem);

		const styleTags = Array.from(document.head.querySelectorAll("style"));
		const uiStyles = styleTags.find((style) =>
			style.textContent.includes(".preference-management"),
		);

		expect(uiStyles).toBeDefined();
		const css = uiStyles.textContent;

		// Check for .subtle-reset-btn styles
		expect(css).toContain(".subtle-reset-btn");
		expect(css).toContain("background: transparent");
		expect(css).toContain("border: 1px solid");
		expect(css).toContain("color: var(--text-dim)");
	});

	it("should NOT contain old action styles", () => {
		new PreferenceManagementUI(container, mockLearningSystem);

		const styleTags = Array.from(document.head.querySelectorAll("style"));
		const uiStyles = styleTags.find((style) =>
			style.textContent.includes(".preference-management"),
		);

		const css = uiStyles.textContent;

		expect(css).not.toContain(".preference-actions");
		expect(css).not.toContain(".refresh-btn");
		expect(css).not.toContain(".reset-btn {"); // Should be replaced by .subtle-reset-btn
	});
});
