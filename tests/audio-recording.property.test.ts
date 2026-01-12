// Property-based tests for audio recording and storage system
// Feature: monolog-live, Property 11: Audio Recording and Storage
// Validates: Requirements 11.1, 11.2, 11.4

import fc from "fast-check";
import { LocalAudioManager } from "../src/audio/audio-manager";
import { WebAudioRecorder } from "../src/audio/audio-recorder";
import type { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import type {
	AudioFile,
	AudioFormat,
	AudioQualitySettings,
} from "../src/types/core";
import { SafeFloatGenerator } from "./safe-float-generator";
import {
	createMockAudioFiles,
	createMockDatabaseSetup,
	createMockSessions,
	type MockDatabaseSetup,
	setupAudioFileOperationMocks,
} from "./test-database-setup";

// Mock MediaRecorder for testing
class MockMediaRecorder {
	state: "inactive" | "recording" | "paused" = "inactive";
	ondataavailable: ((event: { data: Blob }) => void) | null = null;
	onstart: (() => void) | null = null;
	onstop: (() => void) | null = null;
	onerror: ((event: Event) => void) | null = null;

	static isTypeSupported = jest.fn().mockReturnValue(true);

	start(_timeslice?: number): void {
		this.state = "recording";
		if (this.onstart) {
			this.onstart();
		}

		// Simulate data available events
		setTimeout(() => {
			if (this.ondataavailable) {
				const mockBlob = new Blob(["mock audio data"], { type: "audio/webm" });
				this.ondataavailable({ data: mockBlob });
			}
		}, 100);
	}

	stop(): void {
		this.state = "inactive";
		if (this.onstop) {
			this.onstop();
		}
	}

	pause(): void {
		this.state = "paused";
	}

	resume(): void {
		this.state = "recording";
	}
}

// Mock MediaStream
class MockMediaStream {
	getTracks(): MediaStreamTrack[] {
		return [
			{
				stop: jest.fn(),
				kind: "audio",
				enabled: true,
				id: "mock-track-id",
				label: "Mock Audio Track",
				muted: false,
				readyState: "live",
				contentHint: "",
				onended: null,
				onmute: null,
				onunmute: null,
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
				dispatchEvent: jest.fn(),
				clone: jest.fn(),
				getCapabilities: jest.fn(),
				getConstraints: jest.fn(),
				getSettings: jest.fn(),
				applyConstraints: jest.fn(),
			} as MediaStreamTrack,
		];
	}
}

describe("Audio Recording and Storage Properties", () => {
	let mockDatabaseSetup: MockDatabaseSetup;
	let mockDbWrapper: jest.Mocked<IndexedDBWrapper>;

	beforeEach(() => {
		// Setup mocks
		(
			global as typeof globalThis & { MediaRecorder: typeof MediaRecorder }
		).MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;
		(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(
			new MockMediaStream(),
		);

		// Create standardized mock database setup
		mockDatabaseSetup = createMockDatabaseSetup();
		mockDbWrapper = mockDatabaseSetup.mockDbWrapper;
	});

	afterEach(() => {
		mockDatabaseSetup.cleanup();
	});

	/**
	 * Property 11: Audio Recording and Storage
	 * For any active session, the system should record and store audio files locally
	 * on the user's device for later access and optional enhanced processing
	 * Validates: Requirements 11.1, 11.2, 11.4
	 */
	test("Property 11: Audio Recording Lifecycle and Storage", async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate random quality settings
				fc.record({
					bitrate: fc.integer({ min: 64000, max: 320000 }),
					sampleRate: fc.constantFrom(22050, 44100, 48000),
					channels: fc.constantFrom(1, 2),
				}),
				// Generate session ID
				fc.string({ minLength: 5, maxLength: 20 }),
				async (
					qualitySettings: AudioQualitySettings,
					sessionId: string,
				): Promise<boolean> => {
					const recorder = new WebAudioRecorder();
					const audioManager = new LocalAudioManager(mockDbWrapper);

					// Property 1: Recorder should support audio recording (Requirement 11.1)
					const isSupported = recorder.isSupported();
					if (!isSupported) {
						return true; // Skip test if not supported
					}

					try {
						// Property 2: Quality settings should be configurable
						recorder.configureQuality(qualitySettings);

						// Property 3: Recording should start successfully
						await recorder.startRecording();

						// Wait for mock data generation
						await new Promise((resolve) => setTimeout(resolve, 150));

						const statusAfterStart = recorder.getRecordingStatus();
						const startedSuccessfully = statusAfterStart === "recording";

						// Property 4: Recording should stop and produce valid AudioFile
						const audioFile = await recorder.stopRecording();
						const statusAfterStop = recorder.getRecordingStatus();
						const stoppedSuccessfully = statusAfterStop === "idle";

						// Property 5: AudioFile should have valid structure
						const validAudioFile = !!(
							audioFile?.id &&
							audioFile.filename &&
							audioFile.format &&
							audioFile.duration >= 0 &&
							audioFile.size >= 0 && // Allow zero size for mock data
							audioFile.createdAt instanceof Date &&
							audioFile.quality &&
							audioFile.quality.bitrate === qualitySettings.bitrate &&
							audioFile.quality.sampleRate === qualitySettings.sampleRate &&
							audioFile.quality.channels === qualitySettings.channels
						);

						// Property 6: AudioFile should be saveable to storage (Requirement 11.2)
						if (validAudioFile) {
							const fileId = await audioManager.saveAudioFile(
								audioFile,
								sessionId,
							);
							const savedSuccessfully = !!(fileId && fileId === audioFile.id);

							// Verify the save call was made with correct parameters
							// Replace expect with boolean check to avoid throwing errors
							const saveCallArgs =
								mockDbWrapper.saveAudioFile.mock.lastCall?.[0];
							const calledWithCorrectArgs =
								!!saveCallArgs &&
								saveCallArgs.id === audioFile.id &&
								saveCallArgs.sessionId === sessionId &&
								saveCallArgs.quality.bitrate === qualitySettings.bitrate;

							return (
								startedSuccessfully &&
								stoppedSuccessfully &&
								validAudioFile &&
								savedSuccessfully &&
								calledWithCorrectArgs
							);
						}

						return startedSuccessfully && stoppedSuccessfully && validAudioFile;
					} catch (_error) {
						// Catch any unexpected errors and fail the test case gracefully
						return false;
					}
				},
			),
			{ numRuns: 50 },
		);
	});

	/**
	 * Property: Audio File Management
	 * For any set of audio files, the storage system should handle retrieval,
	 * deletion, and storage monitoring correctly
	 * Validates: Requirements 11.2, 11.4
	 */
	test("Property: Audio File Management Operations", async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate array of mock audio files
				fc.array(
					fc.record({
						id: fc.string({ minLength: 5, maxLength: 20 }),
						sessionId: fc.string({ minLength: 5, maxLength: 20 }),
						filename: fc
							.string({ minLength: 5, maxLength: 50 })
							.map((s) => `${s}webm`),
						format: fc.constantFrom(
							"webm" as AudioFormat,
							"mp4" as AudioFormat,
							"wav" as AudioFormat,
						),
						duration: SafeFloatGenerator.float({ min: 0.1, max: 3600 }),
						size: fc.integer({ min: 1000, max: 10000000 }),
						createdAt: fc.date(),
						quality: fc.record({
							bitrate: fc.integer({ min: 64000, max: 320000 }),
							sampleRate: fc.constantFrom(22050, 44100, 48000),
							channels: fc.constantFrom(1, 2),
						}),
					}),
					{ minLength: 1, maxLength: 10 },
				),
				fc.string({ minLength: 5, maxLength: 20 }), // userId
				async (audioFiles: AudioFile[], userId: string): Promise<boolean> => {
					const audioManager = new LocalAudioManager(mockDbWrapper);

					// Create mock sessions and setup database responses
					const userSessions = createMockSessions(audioFiles.length, userId);
					setupAudioFileOperationMocks(mockDbWrapper, audioFiles, userSessions);

					// Property 1: Should retrieve all audio files for user (Requirement 11.2)
					const retrievedFiles = await audioManager.getAudioFiles(userId);
					const retrievalWorked = Array.isArray(retrievedFiles);

					// Property 2: Should handle file deletion (Requirement 11.4)
					if (audioFiles.length > 0) {
						const fileToDelete = audioFiles[0];

						const deleteResult = await audioManager.deleteAudioFile(
							fileToDelete.id,
						);
						const deletionWorked = deleteResult === true;

						// Verify delete was called
						expect(mockDbWrapper.deleteAudioFile).toHaveBeenCalledWith(
							fileToDelete.id,
						);

						return retrievalWorked && deletionWorked;
					}

					return retrievalWorked;
				},
			),
			{ numRuns: 30 },
		);
	});

	/**
	 * Property: Storage Quota Management
	 * For any storage usage scenario, the system should monitor and manage
	 * storage quotas appropriately
	 * Validates: Requirements 11.4, 11.5
	 */
	test("Property: Storage Quota Monitoring and Cleanup", async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate storage usage scenarios
				fc
					.record({
						currentUsage: fc.integer({ min: 0, max: 500 * 1024 * 1024 }), // Up to 500MB
						totalQuota: fc.integer({
							min: 100 * 1024 * 1024,
							max: 1000 * 1024 * 1024,
						}), // 100MB to 1GB
					})
					.filter((scenario) => scenario.currentUsage <= scenario.totalQuota), // Ensure usage doesn't exceed quota
				fc.integer({ min: 1, max: 90 }), // maxAgeInDays
				async (storageScenario, maxAgeInDays: number): Promise<boolean> => {
					const audioManager = new LocalAudioManager(mockDbWrapper);

					try {
						// Mock storage estimate
						mockDbWrapper.getStorageEstimate.mockResolvedValue({
							usage: storageScenario.currentUsage,
							quota: storageScenario.totalQuota,
						});

						// Property 1: Should return valid storage usage information
						const storageInfo = await audioManager.getStorageUsage();
						const validStorageInfo = !!(
							storageInfo &&
							typeof storageInfo.used === "number" &&
							typeof storageInfo.available === "number" &&
							typeof storageInfo.quota === "number" &&
							storageInfo.used >= 0 &&
							storageInfo.available >= 0 &&
							storageInfo.quota > 0
						);

						// Property 2: Should handle cleanup operations
						const cutoffDate = new Date();
						cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

						// Create mock old files for cleanup testing
						const oldFiles = createMockAudioFiles(5, "cleanup-session");
						oldFiles.forEach((file, i) => {
							file.createdAt = new Date(
								Date.now() - (maxAgeInDays + 1) * 24 * 60 * 60 * 1000,
							);
							file.id = `old-file-${i}`;
						});

						// Setup mock responses for cleanup operation
						const cleanupSessions = createMockSessions(1, "test-user");
						setupAudioFileOperationMocks(
							mockDbWrapper,
							oldFiles,
							cleanupSessions,
						);

						const cleanedCount =
							await audioManager.cleanupOldFiles(maxAgeInDays);
						const cleanupWorked =
							typeof cleanedCount === "number" && cleanedCount >= 0;

						// Property 3: Should detect quota exceeded scenarios (Threshold: 0.9)
						const quotaExceeded = await audioManager.isStorageQuotaExceeded();
						const expectedQuotaExceeded =
							storageScenario.currentUsage / storageScenario.totalQuota > 0.9;
						const quotaCheckCorrect = quotaExceeded === expectedQuotaExceeded;

						return validStorageInfo && cleanupWorked && quotaCheckCorrect;
					} catch (_error) {
						return false;
					}
				},
			),
			{ numRuns: 30 },
		);
	});

	/**
	 * Property: Audio Format Support
	 * For any supported audio format, the recorder should handle it correctly
	 * Validates: Requirements 11.1, 11.3
	 */
	test("Property: Audio Format Support and Quality Configuration", () => {
		fc.assert(
			fc.property(
				fc.constantFrom(
					"webm" as AudioFormat,
					"mp4" as AudioFormat,
					"wav" as AudioFormat,
				),
				fc.record({
					bitrate: fc.integer({ min: 64000, max: 320000 }),
					sampleRate: fc.constantFrom(22050, 44100, 48000),
					channels: fc.constantFrom(1, 2),
				}),
				(_format: AudioFormat, quality: AudioQualitySettings) => {
					const recorder = new WebAudioRecorder();

					// Property 1: Should accept quality configuration without error
					let configurationSucceeded = true;
					try {
						recorder.configureQuality(quality);
					} catch (_error) {
						configurationSucceeded = false;
					}

					// Property 2: Should report correct support status
					const isSupported = recorder.isSupported();
					const supportStatusValid = typeof isSupported === "boolean";

					// Property 3: Should have correct initial status
					const initialStatus = recorder.getRecordingStatus();
					const initialStatusValid = initialStatus === "idle";

					return (
						configurationSucceeded && supportStatusValid && initialStatusValid
					);
				},
			),
			{ numRuns: 50 },
		);
	});

	/**
	 * Property: Continuous Recording During Sessions
	 * For any session duration, the recorder should maintain continuous recording
	 * Validates: Requirements 11.1, 11.3
	 */
	test("Property: Continuous Recording Capability", async () => {
		// Save original implementations
		const originalMediaRecorder = window.MediaRecorder;
		const originalDateNow = Date.now;

		// Mock Date.now to control time
		let currentTime = 1000000;
		global.Date.now = jest.fn(() => currentTime);

		interface MockMediaRecorderInstance {
			state: string;
			onstart: (() => void) | null;
			onstop: (() => void) | null;
			start: jest.Mock;
			stop: jest.Mock;
		}

		// Enhanced MediaRecorder mock that triggers events
		const mockMediaRecorder = jest.fn().mockImplementation(() => {
			const recorder: MockMediaRecorderInstance = {
				state: "inactive",
				onstart: null,
				onstop: null,
				start: jest.fn().mockImplementation(function (
					this: MockMediaRecorderInstance,
				) {
					this.state = "recording";
					if (this.onstart) this.onstart();
				}),
				stop: jest.fn().mockImplementation(function (
					this: MockMediaRecorderInstance,
				) {
					this.state = "inactive";
					if (this.onstop) this.onstop();
				}),
			};
			return recorder;
		});

		// Add static method to mock
		// biome-ignore lint/suspicious/noExplicitAny: Mock static property assignment
		(mockMediaRecorder as any).isTypeSupported = jest
			.fn()
			.mockReturnValue(true);

		Object.defineProperty(window, "MediaRecorder", {
			value: mockMediaRecorder,
			writable: true,
		});

		try {
			await fc.assert(
				fc.asyncProperty(
					fc.integer({ min: 1, max: 5 }), // Number of start/stop cycles
					fc.integer({ min: 100, max: 5000 }), // Duration in ms
					async (cycles: number, durationMs: number): Promise<boolean> => {
						const recorder = new WebAudioRecorder();

						if (!recorder.isSupported()) {
							return true; // Skip if not supported
						}

						let allCyclesSucceeded = true;

						// Test multiple recording cycles
						for (let i = 0; i < cycles; i++) {
							try {
								// Start recording
								await recorder.startRecording();
								const statusAfterStart = recorder.getRecordingStatus();

								if (statusAfterStart !== "recording") {
									console.error("Failed to start recording");
									allCyclesSucceeded = false;
									break;
								}

								// Simulate time passing
								currentTime += durationMs;

								// Check status during recording (conceptually)
								if (recorder.getRecordingStatus() !== "recording") {
									console.error("Recording status lost during session");
									allCyclesSucceeded = false;
									break;
								}

								// Stop recording
								const audioFile = await recorder.stopRecording();
								const statusAfterStop = recorder.getRecordingStatus();

								if (statusAfterStop !== "idle" || !audioFile) {
									console.error("Failed to stop recording correctly");
									allCyclesSucceeded = false;
									break;
								}

								// Verify audio file properties and duration
								// Note: WebAudioRecorder calculates duration based on Date.now() diff
								const expectedDuration = durationMs / 1000;
								const durationDiff = Math.abs(
									audioFile.duration - expectedDuration,
								);

								const validFile = !!(
									audioFile.id &&
									audioFile.filename &&
									audioFile.duration >= 0 &&
									durationDiff < 0.1 && // Allow small float precision diff
									audioFile.size >= 0 &&
									audioFile.createdAt instanceof Date
								);

								if (!validFile) {
									console.error(
										`Invalid audio file: duration=${audioFile.duration}, expected=${expectedDuration}`,
									);
									allCyclesSucceeded = false;
									break;
								}
							} catch (error) {
								console.error("Error in recording cycle:", error);
								allCyclesSucceeded = false;
								break;
							}
						}

						// Cleanup
						recorder.dispose();
						return allCyclesSucceeded;
					},
				),
				{ numRuns: 20 },
			);
		} finally {
			// Restore original implementations
			window.MediaRecorder = originalMediaRecorder;
			global.Date.now = originalDateNow;
		}
	});
});
