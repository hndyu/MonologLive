import { PreferenceManagementUI } from "../src/ui/preference-management";

// Mock dependencies
jest.mock("../src/performance/index.js", () => ({
	lazyLoader: {
		isFeatureLoaded: jest.fn().mockReturnValue(false),
		loadFeature: jest.fn().mockResolvedValue({}),
		getFeatureStatus: jest.fn().mockReturnValue([]),
	},
}));

describe("PreferenceManagementUI Style Management", () => {
	let container: HTMLElement;

	beforeEach(() => {
		document.head.innerHTML = "";
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	afterEach(() => {
		document.body.removeChild(container);
	});

	test("should append style tag only once even if initialized multiple times", () => {
		const mockLearning = {
			getWeights: jest.fn().mockReturnValue({}),
			getStats: jest.fn().mockReturnValue({}),
			onInteraction: jest.fn(),
			reset: jest.fn(),
		} as any;

		// First initialization
		new PreferenceManagementUI(container, mockLearning);

		const styleTags1 = document.head.querySelectorAll("style");
		// Depending on other things there might be other styles, but we expect at least one
		const initialCount = styleTags1.length;
		expect(initialCount).toBeGreaterThanOrEqual(1);

		// Second initialization
		new PreferenceManagementUI(container, mockLearning);

		const styleTags2 = document.head.querySelectorAll("style");

		// In the current implementation, this will be initialCount + 1
		// We want it to remain initialCount
		expect(styleTags2.length).toBe(initialCount);
	});
});
