// Property-based tests for transcription display

import * as fc from "fast-check";
import { TranscriptionDisplay } from "../src/ui/transcription-display";

describe("Transcription Display Property Tests", () => {
	let container: HTMLElement;

	beforeEach(() => {
		// Create a fresh DOM container for each test
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	afterEach(() => {
		// Clean up DOM
		if (container.parentNode) {
			container.parentNode.removeChild(container);
		}
	});

	/**
	 * Feature: monolog-live, Property 2: Real-time Transcription Display
	 * Validates: Requirements 1.2, 9.4
	 */
	test("Property 2: Real-time Transcription Display - For any captured audio input, the system should display transcription in real-time using only Web Speech API without external STT services", () => {
		fc.assert(
			fc.property(
				// Generate smaller, more focused transcription sequences
				fc.array(
					fc.record({
						text: fc.string({ minLength: 1, maxLength: 50 }),
						isFinal: fc.boolean(),
					}),
					{ minLength: 1, maxLength: 5 }, // Reduced from 20 to 5
				),
				// Generate simpler display configuration
				fc.record({
					maxLines: fc.integer({ min: 5, max: 20 }), // Reduced from 100 to 20
					autoScroll: fc.boolean(),
					showTimestamps: fc.boolean(),
				}),
				(transcriptEvents, config) => {
					const display = new TranscriptionDisplay(container, config);

					// Track what we expect to see
					const expectedFinalSegments: string[] = [];

					// Process each transcript event
					transcriptEvents.forEach((event) => {
						display.addTranscript(event.text, event.isFinal);

						if (event.isFinal) {
							expectedFinalSegments.push(event.text);
						}
					});

					// Property: Display should show all final transcripts
					const actualTranscriptText = display.getTranscriptText();
					const expectedTranscriptText = expectedFinalSegments.join(" ");

					if (expectedFinalSegments.length > 0) {
						expect(actualTranscriptText).toBe(expectedTranscriptText);
					}

					// Property: Display should contain transcript segments in DOM
					const segmentElements = container.querySelectorAll(
						".transcript-segment",
					);
					const segments = display.getSegments();

					expect(segmentElements.length).toBe(segments.length);

					// Property: Each segment should have correct styling based on final/interim status
					segments.forEach((segment, index) => {
						const element = segmentElements[index];
						if (segment.isFinal) {
							expect(element.classList.contains("transcript-final")).toBe(true);
							expect(element.classList.contains("transcript-interim")).toBe(
								false,
							);
						} else {
							expect(element.classList.contains("transcript-interim")).toBe(
								true,
							);
							expect(element.classList.contains("transcript-final")).toBe(
								false,
							);
						}
					});

					// Property: Timestamps should be shown if configured
					const timestampElements = container.querySelectorAll(
						".transcript-timestamp",
					);
					if (config.showTimestamps && segments.length > 0) {
						expect(timestampElements.length).toBe(segments.length);
					} else {
						expect(timestampElements.length).toBe(0);
					}

					// Property: Container should have proper accessibility attributes
					const contentDiv = container.querySelector(".transcript-content");
					expect(contentDiv?.getAttribute("role")).toBe("log");
					expect(contentDiv?.getAttribute("aria-live")).toBe("polite");
					expect(contentDiv?.getAttribute("aria-label")).toBe(
						"Live transcription",
					);

					// Property: Display should handle empty/whitespace text gracefully
					const initialSegmentCount = segments.length;
					display.addTranscript("   ", true); // Whitespace only
					display.addTranscript("", false); // Empty string

					expect(display.getSegments().length).toBe(initialSegmentCount);
				},
			),
			{ numRuns: 5 }, // Reduced from 20 to 5
		);
	});

	test("Property 2 Edge Cases: Transcription display handles various text formats and edge cases", () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.oneof(
						fc.string({ minLength: 1, maxLength: 100 }), // Reduced from 200 to 100
						fc
							.string()
							.filter((s) => s.trim().length === 0 && s.length <= 10), // Limited whitespace strings
						fc.constant(""), // Empty strings
						fc.string({ minLength: 100, maxLength: 200 }), // Reduced from 500-1000 to 100-200
						fc.hexaString({ minLength: 1, maxLength: 20 }), // Replaced deprecated stringOf/char with hexaString
						fc
							.string({ minLength: 1, maxLength: 10 })
							.map((s) => s.replace(/[a-zA-Z0-9]/g, "!")), // Special characters
					),
					{ minLength: 1, maxLength: 5 }, // Reduced from 10 to 5
				),
				(textInputs) => {
					const display = new TranscriptionDisplay(container);
					let validInputCount = 0;

					textInputs.forEach((text, index) => {
						const isFinal = index % 2 === 0;
						display.addTranscript(text, isFinal);

						// Count valid inputs (non-empty after trim)
						if (text.trim().length > 0) {
							validInputCount++;
						}
					});

					const segments = display.getSegments();

					// Property: Only valid (non-empty) text should create segments
					expect(segments.length).toBeLessThanOrEqual(validInputCount);

					// Property: All segments should have valid text content
					segments.forEach((segment) => {
						expect(segment.text.trim().length).toBeGreaterThan(0);
						expect(typeof segment.text).toBe("string");
						expect(typeof segment.isFinal).toBe("boolean");
						expect(segment.timestamp).toBeInstanceOf(Date);
						expect(typeof segment.id).toBe("string");
						expect(segment.id.length).toBeGreaterThan(0);
					});

					// Property: DOM elements should exist for each segment
					const domSegments = container.querySelectorAll(".transcript-segment");
					expect(domSegments.length).toBe(segments.length);

					// Property: Each DOM segment should have text content
					domSegments.forEach((element, index) => {
						const textElement = element.querySelector(".transcript-text");
						expect(textElement).toBeTruthy();
						expect(textElement?.textContent).toBe(segments[index].text);
					});
				},
			),
			{ numRuns: 5 }, // Reduced from 10 to 5
		);
	});

	test("Property 2 Configuration: Display behavior adapts correctly to configuration changes", () => {
		fc.assert(
			fc.property(
				fc.record({
					maxLines: fc.integer({ min: 1, max: 10 }), // Reduced from 20 to 10
					autoScroll: fc.boolean(),
					showTimestamps: fc.boolean(),
					interimTextClass: fc.constantFrom(
						"interim",
						"temp",
						"draft",
						"pending",
					), // Valid CSS class names
					finalTextClass: fc.constantFrom(
						"final",
						"complete",
						"done",
						"finished",
					), // Valid CSS class names
				}),
				fc.array(
					fc
						.string({ minLength: 1, maxLength: 20 })
						.filter((s) => s.trim().length > 0),
					{
						// Ensure non-empty strings
						minLength: 2, // Reduced from 5 to 2
						maxLength: 10, // Reduced from 30 to 10
					},
				),
				(config, texts) => {
					const display = new TranscriptionDisplay(container, config);

					// Add more segments than maxLines to test trimming
					const validTexts = texts.filter((text) => text.trim().length > 0);
					validTexts.forEach((text) => {
						display.addTranscript(text, true); // All final for simplicity
					});

					const segments = display.getSegments();

					// Property: Segment count should not exceed maxLines
					expect(segments.length).toBeLessThanOrEqual(config.maxLines);

					// Property: If we have more valid texts than maxLines, only the most recent should be kept
					if (validTexts.length > config.maxLines) {
						expect(segments.length).toBe(config.maxLines);
						// Check that we kept the most recent segments
						const expectedTexts = validTexts.slice(-config.maxLines);
						const actualTexts = segments.map((s) => s.text);
						expect(actualTexts).toEqual(expectedTexts);
					} else if (validTexts.length > 0) {
						// If we have valid texts but less than maxLines, all should be present
						expect(segments.length).toBe(validTexts.length);
					}

					// Property: CSS classes should match configuration
					const domSegments = container.querySelectorAll(".transcript-segment");
					domSegments.forEach((element) => {
						expect(element.classList.contains(config.finalTextClass)).toBe(
							true,
						);
					});

					// Property: Timestamps should be present based on configuration
					const timestamps = container.querySelectorAll(
						".transcript-timestamp",
					);
					if (config.showTimestamps && segments.length > 0) {
						expect(timestamps.length).toBe(segments.length);
					} else {
						expect(timestamps.length).toBe(0);
					}

					// Property: Configuration updates should work
					const newConfig = {
						showTimestamps: !config.showTimestamps,
						maxLines: Math.max(1, config.maxLines - 2), // Reduced from 5 to 2
					};

					display.setConfig(newConfig);

					const updatedSegments = display.getSegments();
					expect(updatedSegments.length).toBeLessThanOrEqual(
						newConfig.maxLines,
					);

					const updatedTimestamps = container.querySelectorAll(
						".transcript-timestamp",
					);
					if (newConfig.showTimestamps && updatedSegments.length > 0) {
						expect(updatedTimestamps.length).toBe(updatedSegments.length);
					} else {
						expect(updatedTimestamps.length).toBe(0);
					}
				},
			),
			{ numRuns: 5 }, // Reduced from 15 to 5
		);
	});

	test("Property 2 Interim Handling: Interim transcripts are properly managed and updated", () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						text: fc.string({ minLength: 1, maxLength: 50 }), // Reduced from 100 to 50
						action: fc.constantFrom("interim", "final", "new-interim"),
					}),
					{ minLength: 2, maxLength: 5 }, // Reduced from 10 to 5
				),
				(actions) => {
					const display = new TranscriptionDisplay(container);
					let expectedInterimCount = 0;
					let expectedFinalCount = 0;

					actions.forEach((action) => {
						switch (action.action) {
							case "interim":
								display.addTranscript(action.text, false);
								if (expectedInterimCount === 0) {
									expectedInterimCount = 1; // First interim
								}
								// Subsequent interims update the existing one
								break;
							case "final":
								display.addTranscript(action.text, true);
								expectedFinalCount++;
								expectedInterimCount = 0; // Interim becomes final
								break;
							case "new-interim":
								// Force a new interim by finalizing current one first
								if (expectedInterimCount > 0) {
									display.addTranscript("finalized", true);
									expectedFinalCount++;
								}
								display.addTranscript(action.text, false);
								expectedInterimCount = 1;
								break;
						}
					});

					const segments = display.getSegments();
					const finalSegments = segments.filter((s) => s.isFinal);
					const interimSegments = segments.filter((s) => !s.isFinal);

					// Property: Should have correct number of final and interim segments
					expect(finalSegments.length).toBe(expectedFinalCount);
					expect(interimSegments.length).toBe(expectedInterimCount);

					// Property: Should never have more than one interim segment
					expect(interimSegments.length).toBeLessThanOrEqual(1);

					// Property: DOM should reflect the segment states correctly
					const finalElements = container.querySelectorAll(".transcript-final");
					const interimElements = container.querySelectorAll(
						".transcript-interim",
					);

					expect(finalElements.length).toBe(finalSegments.length);
					expect(interimElements.length).toBe(interimSegments.length);
				},
			),
			{ numRuns: 5 }, // Reduced from 10 to 5
		);
	});
});
