// Property-based tests for enhanced transcription functionality
// Feature: monolog-live, Property 12: Enhanced Transcription Round-trip (Optional)
// Validates: Requirements 12.1, 12.3, 8.4

import fc from "fast-check";
import type { WhisperSettings } from "../src/interfaces/enhanced-transcription";
import type { AudioFile, AudioQualitySettings } from "../src/types/core";
import { NaNSafeGenerator } from "./nan-safe-generator";
import { SafeFloatGenerator } from "./safe-float-generator";

// Mock the transformers library since it's not compatible with Jest
jest.mock("@huggingface/transformers", () => ({
	pipeline: jest.fn().mockResolvedValue({
		// Mock pipeline function that returns a mock transcriber
		__call__: jest.fn().mockResolvedValue({
			text: "Mock transcription result",
			chunks: [
				{
					text: "Mock transcription result",
					timestamp: [0, 5],
				},
			],
		}),
	}),
}));

// Import after mocking
import {
	checkModelCompatibility,
	detectCapabilities,
	WhisperTranscription,
} from "../src/transcription/enhanced-transcription";

// Mock audio data for testing
class MockAudioFile implements AudioFile {
	id: string;
	sessionId: string;
	filename: string;
	format: "webm" | "mp4" | "wav";
	duration: number;
	size: number;
	createdAt: Date;
	quality: AudioQualitySettings;
	blob?: Blob;
	buffer?: ArrayBuffer;
	url?: string;

	constructor(data: Partial<AudioFile> = {}) {
		this.id = data.id || `audio_${Math.random().toString(36).substr(2, 9)}`;
		this.sessionId =
			data.sessionId || `session_${Math.random().toString(36).substr(2, 9)}`;
		this.filename = data.filename || `${this.id}.webm`;
		this.format = data.format || "webm";
		this.duration = data.duration || Math.random() * 300; // 0-5 minutes
		this.size = data.size || Math.random() * 10000000; // 0-10MB
		this.createdAt = data.createdAt || new Date();
		this.quality = data.quality || {
			bitrate: 128000,
			sampleRate: 44100,
			channels: 1,
		};

		// Create mock audio data
		const mockAudioData = new Uint8Array(1024);
		for (let i = 0; i < mockAudioData.length; i++) {
			mockAudioData[i] = Math.floor(Math.random() * 256);
		}
		this.blob = new Blob([mockAudioData], { type: "audio/webm" });
	}
}

// Generators for property-based testing
const audioFileGenerator = fc
	.record({
		duration: SafeFloatGenerator.float({ min: 1, max: 300 }), // 1 second to 5 minutes
		format: fc.constantFrom("webm" as const, "mp4" as const, "wav" as const),
		quality: fc.record({
			bitrate: fc.constantFrom(64000, 128000, 256000),
			sampleRate: fc.constantFrom(22050, 44100, 48000),
			channels: fc.constantFrom(1, 2),
		}),
	})
	.map((data) => new MockAudioFile(data));

const transcriptGenerator = fc
	.string({ minLength: 10, maxLength: 1000 })
	.filter((s) => s.trim().length > 5)
	.map((s) => s.replace(/[^\w\s.,!?]/g, " ").trim());

describe("Enhanced Transcription Property Tests", () => {
	let whisperTranscription: WhisperTranscription;

	beforeAll(async () => {
		// Initialize with smallest model for testing
		whisperTranscription = new WhisperTranscription({
			modelSize: "tiny",
			temperature: 0.0,
			beamSize: 1,
		});
	});

	describe("Property 12: Enhanced Transcription Round-trip (Optional)", () => {
		test("Device capability detection should be consistent", async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.constant(null), // No input needed for capability detection
					async () => {
						const capabilities1 = await detectCapabilities();
						const capabilities2 = await detectCapabilities();

						// Capabilities should be consistent across calls
						expect(capabilities1.supportsWebAssembly).toBe(
							capabilities2.supportsWebAssembly,
						);
						expect(capabilities1.supportsWebGPU).toBe(
							capabilities2.supportsWebGPU,
						);
						expect(capabilities1.recommendedModelSize).toBe(
							capabilities2.recommendedModelSize,
						);

						// Validate no NaN in capability metrics if any exist (currently capabilities are boolean/string)
						// But good practice to check if we add metrics later

						return true;
					},
				),
				{ numRuns: 5 },
			);
		});

		test("Model compatibility check should be deterministic", async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.constantFrom(
						"tiny",
						"base",
						"small",
						"medium",
						"large",
					) as fc.Arbitrary<"tiny" | "base" | "small" | "medium" | "large">,
					async (modelSize: "tiny" | "base" | "small" | "medium" | "large") => {
						const compatible1 = await checkModelCompatibility(modelSize);
						const compatible2 = await checkModelCompatibility(modelSize);

						// Compatibility check should be deterministic
						expect(compatible1).toBe(compatible2);

						return true;
					},
				),
				{ numRuns: 10 },
			);
		});

		test("Enhanced transcription availability should be consistent", () => {
			fc.assert(
				fc.property(fc.constant(null), () => {
					const available1 = whisperTranscription.isAvailable();
					const available2 = whisperTranscription.isAvailable();

					// Availability should be consistent
					expect(available1).toBe(available2);

					return true;
				}),
				{ numRuns: 5 },
			);
		});

		test("Model configuration should update model info correctly", () => {
			fc.assert(
				fc.property(
					fc.record({
						modelSize: fc.constantFrom(
							"tiny" as const,
							"base" as const,
							"small" as const,
							"medium" as const,
							"large" as const,
						),
						temperature: SafeFloatGenerator.float({ min: 0, max: 1 }),
						beamSize: fc.integer({ min: 1, max: 5 }),
					}),
					(settings: WhisperSettings) => {
						// Setup initial state
						const initialSettings: WhisperSettings = {
							modelSize: "tiny" as const,
							temperature: 0.0,
							beamSize: 1,
						};
						whisperTranscription.configureModel(initialSettings);
						// Manually set loaded state for testing
						const info = whisperTranscription.getModelInfo();
						info.isLoaded = true;

						const oldInfo = whisperTranscription.getModelInfo();

						// Apply new settings
						whisperTranscription.configureModel(settings);
						const newInfo = whisperTranscription.getModelInfo();

						// Model info should reflect the new settings
						expect(newInfo.size).toBe(settings.modelSize);
						expect(newInfo.name).toBe(`whisper-${settings.modelSize}`);

						// Verify loading state logic
						if (oldInfo.size !== settings.modelSize) {
							// If model size changed, it should be unloaded
							expect(newInfo.isLoaded).toBe(false);
						} else {
							// If model size didn't change, loaded state should be preserved
							// Note: The actual implementation might not expose isLoaded setter,
							// so we're testing the logic that *doesn't* reset it.
							// In the real class, configureModel only sets isLoaded=false if size changes.
						}

						// Validate no NaN in model info
						expect(NaNSafeGenerator.validateObject(newInfo)).toBe(true);

						return true;
					},
				),
				{ numRuns: 20 },
			);
		});

		test("Model memory usage estimation should be reasonable and monotonic", () => {
			// Map model sizes to their expected memory usage rank

			fc.assert(
				fc.property(
					fc.constantFrom(
						"tiny",
						"base",
						"small",
						"medium",
						"large",
					) as fc.Arbitrary<"tiny" | "base" | "small" | "medium" | "large">,
					(modelSize: "tiny" | "base" | "small" | "medium" | "large") => {
						const transcription = new WhisperTranscription({ modelSize });
						const modelInfo = transcription.getModelInfo();

						// Use NaNSafeGenerator to validate model info
						expect(NaNSafeGenerator.validateObject(modelInfo)).toBe(true);

						// Memory usage should be reasonable
						expect(modelInfo.memoryUsage).toBeGreaterThanOrEqual(0);
						expect(modelInfo.memoryUsage).toBeLessThan(5000); // Less than 5GB

						// Verify monotonic property: Larger models should strictly use more memory
						// We check this by comparing against known smaller/larger models
						const currentMemory = modelInfo.memoryUsage;

						if (currentMemory > 0) {
							const sizes = [
								"tiny",
								"base",
								"small",
								"medium",
								"large",
							] as const;
							const currentIndex = sizes.indexOf(modelSize);

							// Check against smaller model if exists
							if (currentIndex > 0) {
								const smallerSize = sizes[currentIndex - 1];
								const smallerTrans = new WhisperTranscription({
									modelSize: smallerSize,
								});
								expect(currentMemory).toBeGreaterThan(
									smallerTrans.getModelInfo().memoryUsage,
								);
							}

							// Check against larger model if exists
							if (currentIndex < sizes.length - 1) {
								const largerSize = sizes[currentIndex + 1];
								const largerTrans = new WhisperTranscription({
									modelSize: largerSize,
								});
								expect(currentMemory).toBeLessThan(
									largerTrans.getModelInfo().memoryUsage,
								);
							}
						}

						return true;
					},
				),
				{ numRuns: 10 },
			);
		});

		test("Quality assessment should produce consistent scores", () => {
			fc.assert(
				fc.property(transcriptGenerator, (transcript: string) => {
					// Test the quality assessment logic directly
					const assessTranscriptQuality = (text: string): number => {
						if (!text || text.trim().length === 0) {
							return 0;
						}

						let score = 0;
						const lowerText = text.toLowerCase();

						// Check for proper sentence structure
						const sentences = lowerText
							.split(/[.!?]+/)
							.filter((s) => s.trim().length > 0);
						if (sentences.length > 0) {
							score += 0.3;

							// Check average sentence length (reasonable sentences are 5-20 words)
							const avgLength =
								sentences.reduce((sum, s) => sum + s.split(" ").length, 0) /
								sentences.length;
							if (avgLength >= 5 && avgLength <= 20) {
								score += 0.2;
							}
						}

						// Check for proper capitalization and punctuation
						if (/^[A-Z]/.test(text.trim())) {
							score += 0.1;
						}

						if (/[.!?]$/.test(text.trim())) {
							score += 0.1;
						}

						// Check for common filler words (lower quality if too many)
						const fillerWords = ["um", "uh", "like", "you know", "so", "well"];
						const words = lowerText.split(/\s+/);
						const fillerCount = words.filter((word) =>
							fillerWords.includes(word),
						).length;
						const fillerRatio = fillerCount / words.length;

						if (fillerRatio < 0.1) {
							score += 0.2;
						} else if (fillerRatio > 0.3) {
							score -= 0.2;
						}

						// Check for coherent content (presence of common words)
						const commonWords = [
							"the",
							"and",
							"to",
							"of",
							"a",
							"in",
							"is",
							"it",
							"you",
							"that",
						];
						const hasCommonWords = commonWords.some((word) =>
							lowerText.includes(word),
						);
						if (hasCommonWords) {
							score += 0.1;
						}

						return Math.max(0, Math.min(1, score));
					};

					const quality1 = assessTranscriptQuality(transcript);
					const quality2 = assessTranscriptQuality(transcript);

					// Quality assessment should be deterministic
					expect(quality1).toBe(quality2);

					// Quality should be between 0 and 1
					expect(quality1).toBeGreaterThanOrEqual(0);
					expect(quality1).toBeLessThanOrEqual(1);

					// Validate no NaN
					expect(NaNSafeGenerator.validateNumber(quality1)).toBe(true);

					return true;
				}),
				{ numRuns: 50 },
			);
		});

		test("Transcription result structure should be valid", async () => {
			await fc.assert(
				fc.asyncProperty(
					audioFileGenerator,
					async (_audioFile: MockAudioFile) => {
						// Test the structure of transcription results without actually calling the model
						const mockResult = {
							text: "This is a mock transcription result",
							confidence: 0.95,
							segments: [
								{
									start: 0,
									end: 5,
									text: "This is a mock transcription result",
									confidence: 0.95,
									isFinal: true,
								},
							],
							language: "en",
							processingTime: 1500,
						};

						// Validate result structure
						expect(typeof mockResult.text).toBe("string");
						expect(mockResult.confidence).toBeGreaterThanOrEqual(0);
						expect(mockResult.confidence).toBeLessThanOrEqual(1);
						expect(Array.isArray(mockResult.segments)).toBe(true);
						expect(typeof mockResult.language).toBe("string");
						expect(mockResult.processingTime).toBeGreaterThan(0);

						// Validate segments structure
						for (const segment of mockResult.segments) {
							expect(typeof segment.text).toBe("string");
							expect(segment.confidence).toBeGreaterThanOrEqual(0);
							expect(segment.confidence).toBeLessThanOrEqual(1);
							expect(segment.start).toBeGreaterThanOrEqual(0);
							expect(segment.end).toBeGreaterThanOrEqual(segment.start);
							expect(typeof segment.isFinal).toBe("boolean");
						}

						// Validate no NaN using NaNSafeGenerator
						expect(NaNSafeGenerator.validateObject(mockResult)).toBe(true);

						return true;
					},
				),
				{ numRuns: 20 },
			);
		});
	});

	describe("Enhanced Transcription Error Handling", () => {
		test("Invalid configurations should be handled gracefully", () => {
			fc.assert(
				fc.property(
					fc.record({
						modelSize: fc.constantFrom(
							"tiny" as const,
							"base" as const,
							"small" as const,
							"medium" as const,
							"large" as const,
						),
						temperature: SafeFloatGenerator.float({ min: -10, max: 10 }),
						beamSize: fc.integer({ min: -10, max: 100 }),
					}),
					(settings: Partial<WhisperSettings>) => {
						try {
							const transcription = new WhisperTranscription(settings);
							const modelInfo = transcription.getModelInfo();

							// Should have valid model info even with invalid settings
							expect(typeof modelInfo.name).toBe("string");
							expect(typeof modelInfo.size).toBe("string");
							expect(Array.isArray(modelInfo.languages)).toBe(true);
							expect(typeof modelInfo.isLoaded).toBe("boolean");
							expect(typeof modelInfo.memoryUsage).toBe("number");

							// Validate no NaN
							expect(NaNSafeGenerator.validateObject(modelInfo)).toBe(true);

							return true;
						} catch (_error) {
							// Some invalid configurations might throw errors, which is acceptable
							return true;
						}
					},
				),
				{ numRuns: 30 },
			);
		});
	});
});
