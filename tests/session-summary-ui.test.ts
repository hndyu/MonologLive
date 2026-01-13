import { beforeEach, describe, expect, it } from "@jest/globals";
import type { SessionSummary } from "../src/types/core";
import { SessionSummaryUI } from "../src/ui/session-summary";

describe("SessionSummaryUI", () => {
	let container: HTMLElement;
	let ui: SessionSummaryUI;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
		ui = new SessionSummaryUI(container);
	});

	afterEach(() => {
		document.body.removeChild(container);
	});

	it("should show summary data when displayed", () => {
		const mockSummary: SessionSummary = {
			sessionId: "test-session",
			topics: [
				{ name: "Topic 1", relevance: 0.8, mentions: 5, sentiment: 0.5 },
				{ name: "Topic 2", relevance: 0.6, mentions: 3, sentiment: 0.8 },
			],
			insights: [
				{ type: "key_point", content: "Insight 1", confidence: 0.9 },
				{ type: "suggestion", content: "Insight 2", confidence: 0.7 },
			],
			overallSummary: "This is an overall summary of the session.",
			generatedAt: new Date(),
		};

		ui.show(mockSummary);

		expect(container.innerHTML).toContain("test-session");
		expect(container.innerHTML).toContain("Topic 1");
		expect(container.innerHTML).toContain("Topic 2");
		expect(container.innerHTML).toContain("Insight 1");
		expect(container.innerHTML).toContain("Insight 2");
		expect(container.innerHTML).toContain(
			"This is an overall summary of the session.",
		);
	});

	it("should be hidden initially", () => {
		expect(container.querySelector(".session-summary-modal.active")).toBeNull();
	});

	it("should have a close button that hides the summary", () => {
		const mockSummary: SessionSummary = {
			sessionId: "test-session",
			topics: [],
			insights: [],
			overallSummary: "Summary",
			generatedAt: new Date(),
		};

		ui.show(mockSummary);
		expect(
			container.querySelector(".session-summary-modal.active"),
		).not.toBeNull();

		const closeBtn = container.querySelector(
			".close-summary-btn",
		) as HTMLButtonElement;
		closeBtn.click();

		expect(container.querySelector(".session-summary-modal.active")).toBeNull();
	});
});
