import {
	BasicInsightGenerator,
	BasicTopicExtractor,
	SummaryGeneratorImpl,
} from "../src/summary/summary-generator";

describe("SummaryGeneratorImpl - cleanTranscript Japanese support", () => {
	let summaryGenerator: SummaryGeneratorImpl;

	beforeEach(() => {
		summaryGenerator = new SummaryGeneratorImpl(
			new BasicTopicExtractor(),
			new BasicInsightGenerator(),
		);
	});

	it("should not strip Japanese characters from transcript", async () => {
		const japaneseText = "こんにちは、これはテストです。";
		// Access private method for testing
		const cleaned = (
			summaryGenerator as unknown as {
				cleanTranscript: (t: string) => string;
			}
		).cleanTranscript(japaneseText);
		expect(cleaned).toBe(japaneseText);
	});

	it("should strip only prohibited special characters", async () => {
		const textWithSpecial = "こんにちは！ Test text @#$%^&*";
		const cleaned = (
			summaryGenerator as unknown as {
				cleanTranscript: (t: string) => string;
			}
		).cleanTranscript(textWithSpecial);
		// Should keep Japanese, alphanumeric, and basic punctuation
		// @#$%^&* should be removed
		expect(cleaned).toBe("こんにちは！ Test text");
	});

	it("should handle mixed English and Japanese correctly", async () => {
		const mixedText = "今日は sunny ですね。 Let's eat 寿司！";
		const cleaned = (
			summaryGenerator as unknown as {
				cleanTranscript: (t: string) => string;
			}
		).cleanTranscript(mixedText);
		expect(cleaned).toBe(mixedText);
	});
});
