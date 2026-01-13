import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MarkdownExporter } from "../src/summary/markdown-exporter";
import type { SessionSummary } from "../src/types/core";
import { SessionSummaryUI } from "../src/ui/session-summary";

// Mock MarkdownExporter
jest.mock("../src/summary/markdown-exporter");

describe("SessionSummaryUI Extended", () => {
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

	it("should show loading state", () => {
		ui.showLoading();
		expect(container.innerHTML).toContain("Generating summary");
		expect(
			container.querySelector(".session-summary-modal.active"),
		).not.toBeNull();
	});

	it("should have a 'Save as Markdown' button that triggers export", () => {
		const mockSummary: SessionSummary = {
			sessionId: "test-session",
			topics: [],
			insights: [],
			overallSummary: "Summary",
			generatedAt: new Date(),
		};

		ui.show(mockSummary);

		const saveBtn = container.querySelector(
			".save-markdown-btn",
		) as HTMLButtonElement;
		expect(saveBtn).not.toBeNull();

		saveBtn.click();

		// Verify that MarkdownExporter.downloadAsFile was called
		const MockExporter = MarkdownExporter as jest.MockedClass<
			typeof MarkdownExporter
		>;
		expect(MockExporter.prototype.downloadAsFile).toHaveBeenCalledWith(
			mockSummary,
		);
	});
});
