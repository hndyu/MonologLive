import { MarkdownExporter } from "../src/summary/markdown-exporter";
import type { SessionSummary } from "../src/types/core";

describe("MarkdownExporter", () => {
	let exporter: MarkdownExporter;

	beforeEach(() => {
		exporter = new MarkdownExporter();
	});

	it("should convert a SessionSummary to a formatted Markdown string", () => {
		const summary: SessionSummary = {
			sessionId: "session-123",
			overallSummary: "A test session summary.",
			topics: [
				{ name: "Topic 1", relevance: 0.9, mentions: 5, sentiment: 0.5 },
				{ name: "Topic 2", relevance: 0.7, mentions: 2, sentiment: 0.8 },
			],
			insights: [
				{
					type: "strength",
					content: "Good progress on task A.",
					confidence: 0.9,
				},
			],
			generatedAt: new Date("2026-01-13T12:00:00Z"),
		};

		const markdown = exporter.convertToMarkdown(summary);

		expect(markdown).toContain("# Session Summary");
		expect(markdown).toContain("session-123"); // ID is present
		expect(markdown).toContain("A test session summary.");
		expect(markdown).toContain("## Topics");
		expect(markdown).toContain("**Topic 1**");
		expect(markdown).toContain("## AI Insights");
		expect(markdown).toContain("Good progress on task A.");
	});

	it("should include transcript when provided", () => {
		const summary: SessionSummary = {
			sessionId: "session-123",
			overallSummary: "Summary",
			topics: [],
			insights: [],
			generatedAt: new Date(),
		};
		const transcript = "Full transcript text.";

		const markdown = exporter.convertToMarkdown(summary, transcript);

		expect(markdown).toContain("## Full Transcript");
		expect(markdown).toContain("Full transcript text.");
	});
});
