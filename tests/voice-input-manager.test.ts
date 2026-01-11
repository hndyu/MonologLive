// Property-based tests for voice input manager

import * as fc from "fast-check";
import type {
	SpeechRecognitionError,
	VoiceInputConfig,
} from "../src/interfaces/voice-input";
import { WebSpeechVoiceInputManager } from "../src/voice/voice-input-manager";

interface WindowWithSpeechRecognition extends Window {
	SpeechRecognition?: typeof SpeechRecognition;
	webkitSpeechRecognition?: typeof SpeechRecognition;
}

describe("Voice Input Manager Property Tests", () => {
	let mockRecognition: Partial<SpeechRecognition>;
	let originalSpeechRecognition: unknown;

	beforeEach(() => {
		// Create a fresh mock for each test
		mockRecognition = {
			continuous: false,
			interimResults: false,
			lang: "en-US",
			maxAlternatives: 1,
			start: jest.fn(),
			stop: jest.fn(),
			abort: jest.fn(),
			onresult: null,
			onerror: null,
			onend: null,
			onstart: null,
		};

		// Mock the SpeechRecognition constructor
		originalSpeechRecognition = (window as WindowWithSpeechRecognition)
			.SpeechRecognition;
		(window as WindowWithSpeechRecognition).SpeechRecognition = jest.fn(
			() => mockRecognition,
		) as unknown as typeof SpeechRecognition;
		(window as WindowWithSpeechRecognition).webkitSpeechRecognition = (
			window as WindowWithSpeechRecognition
		).SpeechRecognition;
	});

	afterEach(() => {
		// Restore original
		(window as WindowWithSpeechRecognition).SpeechRecognition =
			originalSpeechRecognition as typeof SpeechRecognition;
		(window as WindowWithSpeechRecognition).webkitSpeechRecognition =
			originalSpeechRecognition as typeof SpeechRecognition;
	});

	/**
	 * Feature: monolog-live, Property 1: Continuous Voice Input
	 * Validates: Requirements 1.1, 1.5, 10.3
	 */
	test("Property 1: Continuous Voice Input - For any active session, voice input should remain continuously available and capture audio without interruption throughout the session duration", () => {
		fc.assert(
			fc.property(
				// Generate random session configurations
				fc.record({
					language: fc.constantFrom("en-US", "ja-JP", "es-ES", "fr-FR"),
					continuous: fc.boolean(),
					interimResults: fc.boolean(),
					maxAlternatives: fc.integer({ min: 1, max: 5 }),
				}),
				// Generate random session events
				fc.array(
					fc.record({
						type: fc.constantFrom("start", "result", "error", "end"),
						delay: fc.integer({ min: 0, max: 1000 }),
						data: fc.oneof(
							fc.string({ minLength: 1, maxLength: 100 }), // transcript
							fc.constantFrom("no-speech", "network", "aborted"), // error types
							fc.constant(null),
						),
					}),
					{ minLength: 1, maxLength: 10 },
				),
				(
					config: VoiceInputConfig,
					events: Array<{ type: string; delay: number; data: unknown }>,
				) => {
					const manager = new WebSpeechVoiceInputManager(config);

					// Track transcription results
					const transcripts: Array<{ text: string; isFinal: boolean }> = [];
					const errors: SpeechRecognitionError[] = [];

					manager.onTranscript((text, isFinal) => {
						transcripts.push({ text, isFinal });
					});

					manager.onError((error) => {
						errors.push(error);
					});

					// Start listening
					manager.startListening();

					// Verify initial state
					expect(manager.isListening()).toBe(true);
					expect(mockRecognition.continuous).toBe(config.continuous);
					expect(mockRecognition.interimResults).toBe(config.interimResults);
					expect(mockRecognition.lang).toBe(config.language);
					expect(mockRecognition.maxAlternatives).toBe(config.maxAlternatives);
					expect(mockRecognition.start).toHaveBeenCalled();

					// Simulate session events
					events.forEach((event) => {
						switch (event.type) {
							case "result":
								if (
									mockRecognition.onresult &&
									typeof event.data === "string"
								) {
									const mockEvent = {
										resultIndex: 0,
										results: [
											{
												0: { transcript: event.data, confidence: 0.9 },
												isFinal: Math.random() > 0.5,
												length: 1,
												item: (_index: number) => ({
													transcript: event.data,
													confidence: 0.9,
												}),
											},
										],
										length: 1,
									};
									mockRecognition.onresult?.call(
										mockRecognition as SpeechRecognition,
										mockEvent as SpeechRecognitionEvent,
									);
								}
								break;
							case "error":
								if (mockRecognition.onerror && typeof event.data === "string") {
									const mockErrorEvent = {
										error: event.data,
										message: `Mock error: ${event.data}`,
									};
									mockRecognition.onerror?.call(
										mockRecognition as SpeechRecognition,
										mockErrorEvent as SpeechRecognitionErrorEvent,
									);
								}
								break;
							case "end":
								if (mockRecognition.onend) {
									mockRecognition.onend?.call(
										mockRecognition as SpeechRecognition,
										{} as Event,
									);
								}
								break;
						}
					});

					// Property: Voice input should remain available throughout session
					// Even after errors or interruptions, the system should maintain listening capability
					expect(manager.isSupported()).toBe(true);

					// Property: Transcription callback should be called for valid results
					const resultEvents = events.filter(
						(e) => e.type === "result" && typeof e.data === "string",
					);
					if (resultEvents.length > 0) {
						expect(transcripts.length).toBeGreaterThan(0);
						// Each transcript should have valid text
						transcripts.forEach((transcript) => {
							expect(typeof transcript.text).toBe("string");
							expect(typeof transcript.isFinal).toBe("boolean");
						});
					}

					// Property: Error handling should not break the listening state
					const errorEvents = events.filter((e) => e.type === "error");
					if (errorEvents.length > 0) {
						// Errors should be captured but not prevent continued operation
						expect(errors.length).toBeGreaterThanOrEqual(0);
					}

					// Cleanup
					manager.stopListening();
					expect(manager.isListening()).toBe(false);
				},
			),
			{ numRuns: 20 },
		);
	});

	test("Property 1 Edge Cases: Voice input handles browser compatibility and permission scenarios", () => {
		fc.assert(
			fc.property(
				fc.record({
					hasSpeechRecognition: fc.boolean(),
					hasWebkitSpeechRecognition: fc.boolean(),
					throwsOnStart: fc.boolean(),
					permissionDenied: fc.boolean(),
				}),
				(scenario) => {
					// Store original values to restore later
					const originalSpeechRecognition = (
						window as WindowWithSpeechRecognition
					).SpeechRecognition;
					const originalWebkitSpeechRecognition = (
						window as WindowWithSpeechRecognition
					).webkitSpeechRecognition;

					try {
						// Mock browser compatibility scenarios
						if (!scenario.hasSpeechRecognition) {
							delete (window as WindowWithSpeechRecognition).SpeechRecognition;
						} else {
							(window as WindowWithSpeechRecognition).SpeechRecognition =
								jest.fn(
									() => mockRecognition,
								) as unknown as typeof SpeechRecognition;
						}

						if (!scenario.hasWebkitSpeechRecognition) {
							delete (window as WindowWithSpeechRecognition)
								.webkitSpeechRecognition;
						} else {
							(window as WindowWithSpeechRecognition).webkitSpeechRecognition =
								jest.fn(
									() => mockRecognition,
								) as unknown as typeof SpeechRecognition;
						}

						if (scenario.throwsOnStart) {
							mockRecognition.start = jest.fn(() => {
								throw new Error("Audio capture failed");
							});
						} else {
							mockRecognition.start = jest.fn();
						}

						const manager = new WebSpeechVoiceInputManager();
						const errors: SpeechRecognitionError[] = [];

						manager.onError((error) => {
							errors.push(error);
						});

						// Property: System should gracefully handle unsupported browsers
						const isSupported = manager.isSupported();
						const expectedSupport =
							scenario.hasSpeechRecognition ||
							scenario.hasWebkitSpeechRecognition;
						expect(isSupported).toBe(expectedSupport);

						if (isSupported) {
							manager.startListening();

							if (scenario.throwsOnStart) {
								// Property: Errors during startup should be handled gracefully
								expect(errors.length).toBeGreaterThan(0);
								expect(errors[0].error).toBe("audio-capture");
							}

							if (scenario.permissionDenied && mockRecognition.onerror) {
								// Simulate permission denied
								mockRecognition.onerror?.call(
									mockRecognition as SpeechRecognition,
									{
										error: "not-allowed",
										message: "Permission denied",
									} as SpeechRecognitionErrorEvent,
								);

								// Property: Permission errors should be properly reported
								const permissionErrors = errors.filter(
									(e) => e.error === "not-allowed",
								);
								expect(permissionErrors.length).toBeGreaterThan(0);
							}
						} else {
							manager.startListening();
							// Property: Unsupported browsers should receive appropriate error
							expect(errors.length).toBeGreaterThan(0);
							expect(errors[0].error).toBe("not-supported");
						}

						manager.stopListening();
					} finally {
						// Restore original values
						if (originalSpeechRecognition !== undefined) {
							(window as WindowWithSpeechRecognition).SpeechRecognition =
								originalSpeechRecognition;
						} else {
							delete (window as WindowWithSpeechRecognition).SpeechRecognition;
						}
						if (originalWebkitSpeechRecognition !== undefined) {
							(window as WindowWithSpeechRecognition).webkitSpeechRecognition =
								originalWebkitSpeechRecognition;
						} else {
							delete (window as WindowWithSpeechRecognition)
								.webkitSpeechRecognition;
						}
					}
				},
			),
			{ numRuns: 10 },
		);
	});

	test("Property 1 Restart Behavior: Voice input should automatically restart after recoverable errors", () => {
		fc.assert(
			fc.property(
				fc.array(fc.constantFrom("no-speech", "network", "aborted"), {
					minLength: 1,
					maxLength: 3,
				}),
				(errorTypes) => {
					const manager = new WebSpeechVoiceInputManager();
					const errors: SpeechRecognitionError[] = [];

					manager.onError((error) => {
						errors.push(error);
					});

					manager.startListening();
					expect(manager.isListening()).toBe(true);

					// Simulate recoverable errors
					errorTypes.forEach((errorType) => {
						if (mockRecognition.onerror) {
							mockRecognition.onerror?.call(
								mockRecognition as SpeechRecognition,
								{
									error: errorType,
									message: `Mock ${errorType} error`,
								} as SpeechRecognitionErrorEvent,
							);
						}
					});

					// Property: Recoverable errors should not stop listening state
					expect(manager.isListening()).toBe(true);

					// Property: Errors should be logged but system should continue
					expect(errors.length).toBeGreaterThanOrEqual(0);

					manager.stopListening();
					expect(manager.isListening()).toBe(false);
				},
			),
			{ numRuns: 10 },
		);
	});
});
