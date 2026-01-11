// Property-based tests for silence handling and baseline activity
// Feature: monolog-live, Property 5: Silence Handling
// Validates: Requirements 4.3, 4.5

import fc from "fast-check";
import type { AudioAnalysisData } from "../src/audio/audio-analyzer";
import {
	AdaptiveFrequencyManager,
	DEFAULT_FREQUENCY_CONFIG,
	type FrequencyAdaptationConfig,
} from "../src/comment-generation/adaptive-frequency-manager";

describe("Silence Handling Properties", () => {
	/**
	 * Property 5: Silence Handling
	 * For any period of user silence, the system should reduce comment generation
	 * while maintaining baseline activity to prevent perceived emptiness
	 * Validates: Requirements 4.3, 4.5
	 */
	test("Property 5: Silence Handling", () => {
		fc.assert(
			fc.property(
				// Generate silence duration and baseline activity parameters
				fc.record({
					silenceDuration: fc.float({ min: 1000, max: 30000 }), // 1-30 seconds
					baselineActivity: fc.float({ min: 0.1, max: 0.8 }), // 10-80% baseline
					silenceReduction: fc.float({ min: 0.1, max: 0.9 }), // 10-90% reduction
				}),
				// Generate pre-silence activity level
				fc.record({
					volume: fc.float({ min: 30, max: 80 }),
					speechRate: fc.float({ min: 80, max: 200 }),
					isSpeaking: fc.constant(true),
					silenceDuration: fc.constant(0),
					averageVolume: fc.float({ min: 30, max: 80 }),
					volumeVariance: fc.float({ min: 5, max: 25 }),
				}),
				(silenceConfig, preSilenceAnalysis: AudioAnalysisData) => {
					const config: FrequencyAdaptationConfig = {
						...DEFAULT_FREQUENCY_CONFIG,
						baselineActivity: silenceConfig.baselineActivity,
						silenceReduction: silenceConfig.silenceReduction,
					};

					const manager = new AdaptiveFrequencyManager(config);

					// Establish pre-silence frequency
					manager.updateFromAudioAnalysis(preSilenceAnalysis);
					const preSilenceFrequency =
						manager.getFrequencyState().currentFrequency;

					// Create silence analysis
					const silenceAnalysis: AudioAnalysisData = {
						volume: 0,
						speechRate: 0,
						isSpeaking: false,
						silenceDuration: silenceConfig.silenceDuration,
						averageVolume: preSilenceAnalysis.averageVolume * 0.1, // Decay average
						volumeVariance: 1,
					};

					// Apply silence for multiple updates to simulate extended silence
					for (let i = 0; i < 10; i++) {
						manager.updateFromAudioAnalysis(silenceAnalysis);
					}

					const silenceFrequency = manager.getFrequencyState().currentFrequency;
					const expectedBaselineFrequency =
						config.baseFrequency * config.baselineActivity;

					// Property 1: Frequency should be reduced during silence
					const frequencyReduced = silenceFrequency < preSilenceFrequency;

					// Property 2: Frequency should not drop below baseline activity
					const maintainsBaseline =
						silenceFrequency >= expectedBaselineFrequency * 0.9; // 10% tolerance

					// Property 3: Longer silence should not reduce frequency below baseline
					const respectsBaselineLimit = silenceFrequency >= config.minFrequency;

					return frequencyReduced && maintainsBaseline && respectsBaselineLimit;
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property: Silence Detection Accuracy
	 * For any audio analysis data, silence should be correctly detected based on speaking state
	 * Validates: Requirements 4.3
	 */
	test("Property: Silence Detection Based on Speaking State", () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						volume: fc.float({ min: 0, max: 100 }),
						speechRate: fc.float({ min: 0, max: 300 }),
						isSpeaking: fc.boolean(),
						silenceDuration: fc.float({ min: 0, max: 15000 }),
						averageVolume: fc.float({ min: 0, max: 100 }),
						volumeVariance: fc.float({ min: 0, max: 50 }),
					}),
					{ minLength: 5, maxLength: 15 },
				),
				(analysisSequence: AudioAnalysisData[]) => {
					const manager = new AdaptiveFrequencyManager(
						DEFAULT_FREQUENCY_CONFIG,
					);

					let correctSilenceDetection = true;

					for (const analysis of analysisSequence) {
						manager.updateFromAudioAnalysis(analysis);
						const state = manager.getFrequencyState();

						// Property: Silence state should match isSpeaking flag
						if (state.isInSilence !== !analysis.isSpeaking) {
							correctSilenceDetection = false;
							break;
						}

						// Property: Silence duration should be tracked correctly
						if (!analysis.isSpeaking && analysis.silenceDuration > 0) {
							if (state.silenceDuration !== analysis.silenceDuration) {
								correctSilenceDetection = false;
								break;
							}
						}
					}

					return correctSilenceDetection;
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property: Gradual Silence Adaptation
	 * For any transition from speech to silence, frequency reduction should be gradual
	 * Validates: Requirements 4.3, 4.5
	 */
	test("Property: Gradual Frequency Reduction During Silence Transition", () => {
		fc.assert(
			fc.property(
				fc.float({ min: 0.3, max: 0.9 }), // adaptation smoothness
				fc.integer({ min: 5, max: 15 }), // number of silence updates
				(adaptationSmoothness: number, numUpdates: number) => {
					const config: FrequencyAdaptationConfig = {
						...DEFAULT_FREQUENCY_CONFIG,
						adaptationSmoothness: adaptationSmoothness,
					};

					const manager = new AdaptiveFrequencyManager(config);

					// Start with active speech
					const activeAnalysis: AudioAnalysisData = {
						volume: 60,
						speechRate: 150,
						isSpeaking: true,
						silenceDuration: 0,
						averageVolume: 60,
						volumeVariance: 15,
					};

					manager.updateFromAudioAnalysis(activeAnalysis);
					const initialFrequency = manager.getFrequencyState().currentFrequency;

					// Transition to silence gradually
					const frequencyChanges: number[] = [];

					for (let i = 1; i <= numUpdates; i++) {
						const silenceAnalysis: AudioAnalysisData = {
							volume: 0,
							speechRate: 0,
							isSpeaking: false,
							silenceDuration: i * 1000, // Increasing silence duration
							averageVolume: Math.max(10, 60 - i * 5), // Gradual decay
							volumeVariance: Math.max(1, 15 - i),
						};

						manager.updateFromAudioAnalysis(silenceAnalysis);
						const currentFrequency =
							manager.getFrequencyState().currentFrequency;
						frequencyChanges.push(currentFrequency);
					}

					// Property 1: Changes should be gradual (no sudden jumps)
					let gradualChanges = true;
					for (let i = 1; i < frequencyChanges.length; i++) {
						const change = Math.abs(
							frequencyChanges[i] - frequencyChanges[i - 1],
						);
						const maxGradualChange = initialFrequency * 0.2; // Max 20% change per step

						if (change > maxGradualChange) {
							gradualChanges = false;
							break;
						}
					}

					// Property 2: Overall trend should be downward (frequency reduction)
					const finalFrequency = frequencyChanges[frequencyChanges.length - 1];
					const overallReduction = finalFrequency < initialFrequency;

					// Property 3: Should not drop below minimum frequency
					const respectsMinimum = frequencyChanges.every(
						(freq) => freq >= config.minFrequency,
					);

					return gradualChanges && overallReduction && respectsMinimum;
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property: Silence Recovery Behavior
	 * For any transition from silence back to speech, frequency should recover appropriately
	 * Validates: Requirements 4.3, 4.5
	 */
	test("Property: Frequency Recovery After Silence", () => {
		fc.assert(
			fc.property(
				fc.record({
					silenceDuration: fc.float({ min: 2000, max: 20000 }),
					recoveryVolume: fc.float({ min: 40, max: 90 }),
					recoverySpeechRate: fc.float({ min: 100, max: 250 }),
				}),
				(recoveryParams) => {
					const manager = new AdaptiveFrequencyManager(
						DEFAULT_FREQUENCY_CONFIG,
					);

					// Start with active speech
					const initialAnalysis: AudioAnalysisData = {
						volume: 50,
						speechRate: 120,
						isSpeaking: true,
						silenceDuration: 0,
						averageVolume: 50,
						volumeVariance: 12,
					};

					manager.updateFromAudioAnalysis(initialAnalysis);
					const _initialFrequency =
						manager.getFrequencyState().currentFrequency;

					// Apply extended silence
					const silenceAnalysis: AudioAnalysisData = {
						volume: 0,
						speechRate: 0,
						isSpeaking: false,
						silenceDuration: recoveryParams.silenceDuration,
						averageVolume: 20,
						volumeVariance: 2,
					};

					// Apply silence multiple times
					for (let i = 0; i < 8; i++) {
						manager.updateFromAudioAnalysis(silenceAnalysis);
					}

					const silenceFrequency = manager.getFrequencyState().currentFrequency;

					// Recover with speech
					const recoveryAnalysis: AudioAnalysisData = {
						volume: recoveryParams.recoveryVolume,
						speechRate: recoveryParams.recoverySpeechRate,
						isSpeaking: true,
						silenceDuration: 0,
						averageVolume: recoveryParams.recoveryVolume,
						volumeVariance: 15,
					};

					// Apply recovery multiple times
					for (let i = 0; i < 5; i++) {
						manager.updateFromAudioAnalysis(recoveryAnalysis);
					}

					const recoveryFrequency =
						manager.getFrequencyState().currentFrequency;

					// Property 1: Recovery frequency should be higher than silence frequency
					const frequencyIncreased = recoveryFrequency > silenceFrequency;

					// Property 2: Recovery should move toward appropriate level for the new activity
					const appropriateRecovery =
						recoveryFrequency > DEFAULT_FREQUENCY_CONFIG.baseFrequency * 0.8;

					// Property 3: Recovery should not exceed maximum frequency
					const respectsMaximum =
						recoveryFrequency <= DEFAULT_FREQUENCY_CONFIG.maxFrequency;

					return frequencyIncreased && appropriateRecovery && respectsMaximum;
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property: Baseline Activity Configuration
	 * For any baseline activity setting, the system should maintain at least that level during silence
	 * Validates: Requirements 4.5
	 */
	test("Property: Configurable Baseline Activity Maintenance", () => {
		fc.assert(
			fc.property(
				fc.float({ min: 0.1, max: 0.8 }), // baseline activity ratio
				fc.float({ min: 3, max: 15 }), // base frequency
				fc.float({ min: 10000, max: 30000 }), // extended silence duration
				(
					baselineActivity: number,
					baseFrequency: number,
					silenceDuration: number,
				) => {
					const config: FrequencyAdaptationConfig = {
						...DEFAULT_FREQUENCY_CONFIG,
						baselineActivity: baselineActivity,
						baseFrequency: baseFrequency,
					};

					const manager = new AdaptiveFrequencyManager(config);

					// Apply extended silence
					const silenceAnalysis: AudioAnalysisData = {
						volume: 0,
						speechRate: 0,
						isSpeaking: false,
						silenceDuration: silenceDuration,
						averageVolume: 5,
						volumeVariance: 1,
					};

					// Apply silence for many updates to ensure stabilization
					for (let i = 0; i < 20; i++) {
						manager.updateFromAudioAnalysis(silenceAnalysis);
					}

					const finalFrequency = manager.getFrequencyState().currentFrequency;
					const expectedBaselineFrequency = baseFrequency * baselineActivity;

					// Property: Final frequency should be at or above the configured baseline
					// Allow small tolerance for floating point precision
					return finalFrequency >= expectedBaselineFrequency * 0.95;
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property: Silence Duration Tracking
	 * For any sequence of silence periods, duration should be tracked accurately
	 * Validates: Requirements 4.3
	 */
	test("Property: Accurate Silence Duration Tracking", () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						isSpeaking: fc.boolean(),
						silenceDuration: fc.float({ min: 0, max: 10000 }),
						volume: fc.float({ min: 0, max: 100 }),
						speechRate: fc.float({ min: 0, max: 200 }),
						averageVolume: fc.float({ min: 0, max: 100 }),
						volumeVariance: fc.float({ min: 0, max: 30 }),
					}),
					{ minLength: 3, maxLength: 10 },
				),
				(analysisSequence: AudioAnalysisData[]) => {
					const manager = new AdaptiveFrequencyManager(
						DEFAULT_FREQUENCY_CONFIG,
					);

					let accurateTracking = true;

					for (const analysis of analysisSequence) {
						// Skip invalid data (NaN values)
						if (
							Number.isNaN(analysis.silenceDuration) ||
							Number.isNaN(analysis.volume) ||
							Number.isNaN(analysis.speechRate) ||
							Number.isNaN(analysis.averageVolume) ||
							Number.isNaN(analysis.volumeVariance)
						) {
							continue;
						}

						manager.updateFromAudioAnalysis(analysis);
						const state = manager.getFrequencyState();

						// Property 1: Silence duration should match input when not speaking
						if (!analysis.isSpeaking && analysis.silenceDuration > 0) {
							if (
								Math.abs(state.silenceDuration - analysis.silenceDuration) > 100
							) {
								// 100ms tolerance
								accurateTracking = false;
								break;
							}
						}

						// Property 2: Silence state should be consistent with speaking state
						if (state.isInSilence === analysis.isSpeaking) {
							accurateTracking = false;
							break;
						}
					}

					return accurateTracking;
				},
			),
			{ numRuns: 100 },
		);
	});
});
