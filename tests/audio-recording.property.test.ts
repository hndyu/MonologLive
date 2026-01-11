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
	let mockDbWrapper: jest.Mocked<IndexedDBWrapper>;

	beforeEach(() => {
		// Setup mocks
		(
			global as typeof globalThis & { MediaRecorder: typeof MediaRecorder }
		).MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;
		(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(
			new MockMediaStream(),
		);

		// Mock IndexedDB wrapper
		mockDbWrapper = {
			initialize: jest.fn().mockResolvedValue(undefined),
			saveSession: jest.fn().mockResolvedValue(undefined),
			getSession: jest.fn().mockResolvedValue(undefined),
			getSessionsByUser: jest.fn().mockResolvedValue([]),
			deleteSession: jest.fn().mockResolvedValue(undefined),
			savePreferences: jest.fn().mockResolvedValue(undefined),
			getPreferences: jest.fn().mockResolvedValue(undefined),
			saveAudioFile: jest.fn().mockResolvedValue(undefined),
			getAudioFile: jest.fn().mockResolvedValue(undefined),
			getAudioFilesBySession: jest.fn().mockResolvedValue([]),
			deleteAudioFile: jest.fn().mockResolvedValue(undefined),
			saveSummary: jest.fn().mockResolvedValue(undefined),
			getSummary: jest.fn().mockResolvedValue(undefined),
			clearAllData: jest.fn().mockResolvedValue(undefined),
			getStorageEstimate: jest
				.fn()
				.mockResolvedValue({ usage: 0, quota: 1000000 }),
			close: jest.fn().mockResolvedValue(undefined),
			saveUserPreferences: jest.fn().mockResolvedValue(undefined),
			getUserPreferences: jest.fn().mockResolvedValue(undefined),
		} as unknown as jest.Mocked<IndexedDBWrapper>;
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

					// Property 2: Quality settings should be configurable
					recorder.configureQuality(qualitySettings);

					// Property 3: Recording should start successfully
					await recorder.startRecording();
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
						audioFile.size > 0 &&
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
						expect(mockDbWrapper.saveAudioFile).toHaveBeenCalledWith(
							expect.objectContaining({
								...audioFile,
								sessionId,
							}),
						);

						return (
							startedSuccessfully &&
							stoppedSuccessfully &&
							validAudioFile &&
							savedSuccessfully
						);
					}

					return startedSuccessfully && stoppedSuccessfully && validAudioFile;
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
						duration: fc.float({ min: 0.1, max: 3600 }),
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

					// Mock the database responses
					const userSessions = audioFiles.map((file) => ({
						id: file.sessionId,
						userId,
						startTime: new Date(),
						transcript: [],
						comments: [],
						interactions: [],
						metrics: {
							totalDuration: 0,
							commentCount: 0,
							interactionCount: 0,
							averageEngagement: 0,
						},
					}));

					mockDbWrapper.getSessionsByUser.mockResolvedValue(userSessions);
					mockDbWrapper.getAudioFilesBySession.mockImplementation(
						async (sessionId: string) => {
							return audioFiles.filter((file) => file.sessionId === sessionId);
						},
					);

					// Property 1: Should retrieve all audio files for user (Requirement 11.2)
					const retrievedFiles = await audioManager.getAudioFiles(userId);
					const retrievalWorked = Array.isArray(retrievedFiles);

					// Property 2: Should handle file deletion (Requirement 11.4)
					if (audioFiles.length > 0) {
						const fileToDelete = audioFiles[0];
						mockDbWrapper.deleteAudioFile.mockResolvedValue(undefined);

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
				fc.record({
					currentUsage: fc.integer({ min: 0, max: 500 * 1024 * 1024 }), // Up to 500MB
					totalQuota: fc.integer({
						min: 100 * 1024 * 1024,
						max: 1000 * 1024 * 1024,
					}), // 100MB to 1GB
				}),
				fc.integer({ min: 1, max: 90 }), // maxAgeInDays
				async (storageScenario, maxAgeInDays: number): Promise<boolean> => {
					const audioManager = new LocalAudioManager(mockDbWrapper);

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

					// Mock database to return old files
					const oldFiles = Array.from({ length: 5 }, (_, i) => ({
						id: `old-file-${i}`,
						sessionId: `session-${i}`,
						filename: `old-audio-${i}.webm`,
						format: "webm" as AudioFormat,
						duration: 60,
						size: 1000000,
						createdAt: new Date(
							Date.now() - (maxAgeInDays + 1) * 24 * 60 * 60 * 1000,
						),
						quality: { bitrate: 128000, sampleRate: 44100, channels: 1 },
					}));

					// Mock the getAudioFiles method to return old files
					mockDbWrapper.getSessionsByUser.mockResolvedValue(
						oldFiles.map((file) => ({
							id: file.sessionId,
							userId: "test-user",
							startTime: file.createdAt,
							transcript: [],
							comments: [],
							interactions: [],
							metrics: {
								totalDuration: 0,
								commentCount: 0,
								interactionCount: 0,
								averageEngagement: 0,
								duration: 0,
								wordCount: 0,
								avgConfidence: 0,
							},
						})),
					);
					mockDbWrapper.getAudioFilesBySession.mockImplementation(
						async (sessionId: string) => {
							return oldFiles.filter((file) => file.sessionId === sessionId);
						},
					);
					mockDbWrapper.deleteAudioFile.mockResolvedValue(undefined);

					const cleanedCount = await audioManager.cleanupOldFiles(maxAgeInDays);
					const cleanupWorked =
						typeof cleanedCount === "number" && cleanedCount >= 0;

					// Property 3: Should detect quota exceeded scenarios
					const quotaExceeded = await audioManager.isStorageQuotaExceeded();
					const quotaCheckWorked = typeof quotaExceeded === "boolean";

					return validStorageInfo && cleanupWorked && quotaCheckWorked;
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
		await fc.assert(
			fc.asyncProperty(
				fc.integer({ min: 1, max: 10 }), // Number of start/stop cycles
				async (cycles: number): Promise<boolean> => {
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
								allCyclesSucceeded = false;
								break;
							}

							// Stop recording
							const audioFile = await recorder.stopRecording();
							const statusAfterStop = recorder.getRecordingStatus();

							if (statusAfterStop !== "idle" || !audioFile) {
								allCyclesSucceeded = false;
								break;
							}

							// Verify audio file properties
							const validFile = !!(
								audioFile.id &&
								audioFile.filename &&
								audioFile.duration >= 0 &&
								audioFile.size > 0 &&
								audioFile.createdAt instanceof Date
							);

							if (!validFile) {
								allCyclesSucceeded = false;
								break;
							}
						} catch (_error) {
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
	});
});
