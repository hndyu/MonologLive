// Property-based tests for volume and speech rate adaptation
// Feature: monolog-live, Property 4: Volume-Based Comment Adaptation
// Validates: Requirements 4.1, 4.2

import fc from "fast-check";
import type { AudioAnalysisData } from "../src/audio/audio-analyzer";
import {
	AdaptiveFrequencyManager,
	DEFAULT_FREQUENCY_CONFIG,
	type FrequencyAdaptationConfig,
} from "../src/comment-generation/adaptive-frequency-manager";

describe("Volume Adaptation Properties", () => {
	/**
	 * Property 4: Volume-Based Comment Adaptation
	 * For any change in user speech volume or rate, the system should adjust
	 * comment frequency and reactivity accordingly
	 * Validates: Requirements 4.1, 4.2
	 */
	test("Property 4: Volume-Based Comment Adaptation", () => {
		fc.assert(
			fc.property(
				// Generate audio analysis data with varying volume levels
				fc.record({
					volume: fc.float({ min: 0, max: 100 }),
					speechRate: fc.float({ min: 0, max: 300 }), // words per minute
					isSpeaking: fc.boolean(),
					silenceDuration: fc.float({ min: 0, max: 10000 }),
					averageVolume: fc.float({ min: 0, max: 100 }),
					volumeVariance: fc.float({ min: 0, max: 50 }),
				}),
				// Generate a sequence of volume changes
				fc.array(
					fc.record({
						volume: fc.float({ min: 0, max: 100 }),
						speechRate: fc.float({ min: 0, max: 300 }),
						isSpeaking: fc.boolean(),
						silenceDuration: fc.float({ min: 0, max: 5000 }),
						averageVolume: fc.float({ min: 0, max: 100 }),
						volumeVariance: fc.float({ min: 0, max: 50 }),
					}),
					{ minLength: 3, maxLength: 10 },
				),
				(
					initialAnalysis: AudioAnalysisData,
					volumeSequence: AudioAnalysisData[],
				) => {
					const manager = new AdaptiveFrequencyManager(
						DEFAULT_FREQUENCY_CONFIG,
					);

					// Record initial frequency
					manager.updateFromAudioAnalysis(initialAnalysis);
					const initialFrequency = manager.getFrequencyState().currentFrequency;

					// Apply volume sequence and track frequency changes
					const frequencyChanges: number[] = [];

					for (const analysis of volumeSequence) {
						manager.updateFromAudioAnalysis(analysis);
						const currentFrequency =
							manager.getFrequencyState().currentFrequency;
						frequencyChanges.push(currentFrequency);
					}

					// Property 1: Higher volume should generally lead to higher frequency
					let volumeFrequencyCorrelation = true;
					for (let i = 1; i < volumeSequence.length; i++) {
						const prevVolume = volumeSequence[i - 1].volume;
						const currVolume = volumeSequence[i].volume;
						const prevFreq =
							i === 1 ? initialFrequency : frequencyChanges[i - 2];
						const currFreq = frequencyChanges[i - 1];

						// If volume increased significantly, frequency should not decrease significantly
						if (currVolume > prevVolume + 20) {
							if (currFreq < prevFreq * 0.8) {
								volumeFrequencyCorrelation = false;
								break;
							}
						}

						// If volume decreased significantly, frequency should not increase significantly
						if (currVolume < prevVolume - 20) {
							if (currFreq > prevFreq * 1.2) {
								volumeFrequencyCorrelation = false;
								break;
							}
						}
					}

					// Property 2: Speech rate should influence frequency
					let speechRateInfluence = true;
					for (let i = 1; i < volumeSequence.length; i++) {
						const prevRate = volumeSequence[i - 1].speechRate;
						const currRate = volumeSequence[i].speechRate;
						const prevFreq =
							i === 1 ? initialFrequency : frequencyChanges[i - 2];
						const currFreq = frequencyChanges[i - 1];

						// If speech rate increased significantly, frequency should not decrease significantly
						if (currRate > prevRate + 50 && currRate > 100) {
							if (currFreq < prevFreq * 0.9) {
								speechRateInfluence = false;
								break;
							}
						}
					}

					// Property 3: Frequency should stay within configured bounds
					const allFrequenciesInBounds = frequencyChanges.every(
						(freq) =>
							freq >= DEFAULT_FREQUENCY_CONFIG.minFrequency &&
							freq <= DEFAULT_FREQUENCY_CONFIG.maxFrequency,
					);

					// Property 4: Frequency changes should be smooth (not erratic)
					let smoothChanges = true;
					for (let i = 1; i < frequencyChanges.length; i++) {
						const change = Math.abs(
							frequencyChanges[i] - frequencyChanges[i - 1],
						);
						const maxChange = DEFAULT_FREQUENCY_CONFIG.baseFrequency * 0.5; // Max 50% change per update
						if (change > maxChange) {
							smoothChanges = false;
							break;
						}
					}

					return (
						volumeFrequencyCorrelation &&
						speechRateInfluence &&
						allFrequenciesInBounds &&
						smoothChanges
					);
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property: Volume Threshold Behavior
	 * For any volume below threshold, the system should treat it as silence
	 * Validates: Requirements 4.1, 4.3
	 */
	test("Property: Volume Threshold Determines Speech Detection", () => {
		fc.assert(
			fc.property(
				fc.float({ min: 5, max: 50 }), // volume threshold
				fc.array(
					fc.record({
						volume: fc.float({ min: 0, max: 100 }),
						speechRate: fc.float({ min: 0, max: 200 }),
						isSpeaking: fc.boolean(),
						silenceDuration: fc.float({ min: 0, max: 5000 }),
						averageVolume: fc.float({ min: 0, max: 100 }),
						volumeVariance: fc.float({ min: 0, max: 30 }),
					}),
					{ minLength: 5, maxLength: 15 },
				),
				(volumeThreshold: number, analysisSequence: AudioAnalysisData[]) => {
					const config: FrequencyAdaptationConfig = {
						...DEFAULT_FREQUENCY_CONFIG,
						volumeMultiplier: 1.0, // Make volume influence more pronounced
					};

					const manager = new AdaptiveFrequencyManager(config);

					const belowThresholdFrequencies: number[] = [];
					const aboveThresholdFrequencies: number[] = [];

					for (const analysis of analysisSequence) {
						// Override isSpeaking based on our threshold
						const adjustedAnalysis = {
							...analysis,
							isSpeaking: analysis.volume > volumeThreshold,
						};

						manager.updateFromAudioAnalysis(adjustedAnalysis);
						const frequency = manager.getFrequencyState().currentFrequency;

						if (analysis.volume <= volumeThreshold) {
							belowThresholdFrequencies.push(frequency);
						} else {
							aboveThresholdFrequencies.push(frequency);
						}
					}

					// Skip if we don't have both categories
					if (
						belowThresholdFrequencies.length === 0 ||
						aboveThresholdFrequencies.length === 0
					) {
						return true;
					}

					// Property: Average frequency should be lower for below-threshold volumes
					const avgBelowThreshold =
						belowThresholdFrequencies.reduce((sum, freq) => sum + freq, 0) /
						belowThresholdFrequencies.length;
					const avgAboveThreshold =
						aboveThresholdFrequencies.reduce((sum, freq) => sum + freq, 0) /
						aboveThresholdFrequencies.length;

					return avgBelowThreshold <= avgAboveThreshold;
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property: Baseline Activity Maintenance
	 * For any extended silence period, the system should maintain minimum baseline activity
	 * Validates: Requirements 4.5
	 */
	test("Property: Baseline Activity During Extended Silence", () => {
		fc.assert(
			fc.property(
				fc.float({ min: 5000, max: 30000 }), // extended silence duration
				(silenceDuration: number) => {
					const manager = new AdaptiveFrequencyManager(
						DEFAULT_FREQUENCY_CONFIG,
					);

					// Create extended silence analysis
					const silenceAnalysis: AudioAnalysisData = {
						volume: 0,
						speechRate: 0,
						isSpeaking: false,
						silenceDuration: silenceDuration,
						averageVolume: 5,
						volumeVariance: 1,
					};

					// Apply silence analysis multiple times to simulate extended silence
					for (let i = 0; i < 10; i++) {
						manager.updateFromAudioAnalysis(silenceAnalysis);
					}

					const finalFrequency = manager.getFrequencyState().currentFrequency;
					const baselineFrequency =
						DEFAULT_FREQUENCY_CONFIG.baseFrequency *
						DEFAULT_FREQUENCY_CONFIG.baselineActivity;

					// Property: Frequency should not drop below baseline activity level
					return finalFrequency >= baselineFrequency * 0.9; // Allow 10% tolerance
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property: Comment Generation Timing
	 * For any frequency setting, shouldGenerateComment should respect timing constraints
	 * Validates: Requirements 4.1, 4.2
	 */
	test("Property: Comment Generation Respects Frequency Timing", () => {
		fc.assert(
			fc.property(
				fc.float({ min: 2, max: 20 }), // target frequency (comments per minute)
				fc.integer({ min: 5, max: 20 }), // number of checks
				(targetFrequency: number, numChecks: number) => {
					const config: FrequencyAdaptationConfig = {
						...DEFAULT_FREQUENCY_CONFIG,
						baseFrequency: targetFrequency,
					};

					const manager = new AdaptiveFrequencyManager(config);

					// Set up analysis that should maintain target frequency
					const steadyAnalysis: AudioAnalysisData = {
						volume: 50,
						speechRate: 120,
						isSpeaking: true,
						silenceDuration: 0,
						averageVolume: 50,
						volumeVariance: 10,
					};

					manager.updateFromAudioAnalysis(steadyAnalysis);

					let _generationAttempts = 0;
					let actualGenerations = 0;

					// Simulate checking for comment generation over time
					for (let i = 0; i < numChecks; i++) {
						_generationAttempts++;

						if (manager.shouldGenerateComment()) {
							manager.recordCommentGenerated();
							actualGenerations++;
						}

						// Simulate time passing (vary the intervals)
						const timeInterval = 1000 + Math.random() * 2000; // 1-3 seconds
						// Use public method instead of accessing private state
						manager.updateFromAudioAnalysis({
							volume: 0.5,
							speechRate: 1.0,
							silenceDuration: timeInterval,
							volumeVariance: 10,
							isSpeaking: false,
							averageVolume: 0.5,
						});
					}

					// Property: Generation rate should be reasonable relative to target frequency
					// We can't expect exact timing due to randomization, but it should be in the ballpark
					const expectedGenerations = Math.max(1, Math.floor(numChecks * 0.3)); // At least 30% success rate
					const maxExpectedGenerations = Math.ceil(numChecks * 0.8); // At most 80% success rate

					return (
						actualGenerations >= expectedGenerations &&
						actualGenerations <= maxExpectedGenerations
					);
				},
			),
			{ numRuns: 50 },
		);
	});

	/**
	 * Property: Configuration Bounds Enforcement
	 * For any configuration values, the system should enforce min/max frequency bounds
	 * Validates: Requirements 4.1, 4.2
	 */
	test("Property: Frequency Bounds Are Always Enforced", () => {
		fc.assert(
			fc.property(
				fc.record({
					minFrequency: fc.float({ min: 0.5, max: 5 }),
					maxFrequency: fc.float({ min: 10, max: 50 }),
					baseFrequency: fc.float({ min: 3, max: 15 }),
				}),
				fc.array(
					fc.record({
						volume: fc.float({ min: 0, max: 100 }),
						speechRate: fc.float({ min: 0, max: 400 }),
						isSpeaking: fc.boolean(),
						silenceDuration: fc.float({ min: 0, max: 10000 }),
						averageVolume: fc.float({ min: 0, max: 100 }),
						volumeVariance: fc.float({ min: 0, max: 60 }),
					}),
					{ minLength: 10, maxLength: 20 },
				),
				(configParams, analysisSequence: AudioAnalysisData[]) => {
					// Ensure valid config (min < max)
					const minFreq = Math.min(
						configParams.minFrequency,
						configParams.maxFrequency - 1,
					);
					const maxFreq = Math.max(
						configParams.maxFrequency,
						configParams.minFrequency + 1,
					);
					const baseFreq = Math.max(
						minFreq,
						Math.min(maxFreq, configParams.baseFrequency),
					);

					const config: FrequencyAdaptationConfig = {
						...DEFAULT_FREQUENCY_CONFIG,
						minFrequency: minFreq,
						maxFrequency: maxFreq,
						baseFrequency: baseFreq,
					};

					const manager = new AdaptiveFrequencyManager(config);

					// Apply extreme analysis values to try to break bounds
					for (const analysis of analysisSequence) {
						manager.updateFromAudioAnalysis(analysis);
						const currentFrequency =
							manager.getFrequencyState().currentFrequency;

						// Property: Frequency must always be within bounds
						if (currentFrequency < minFreq || currentFrequency > maxFreq) {
							return false;
						}
					}

					return true;
				},
			),
			{ numRuns: 100 },
		);
	});
});
