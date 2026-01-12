// Common test database setup utilities
// Provides standardized mock setup for IndexedDB and Audio Manager testing

import type { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import type { AudioFile, Session } from "../src/types/core";

export interface MockIDBDatabase {
	getAll: jest.Mock;
	put: jest.Mock;
	get: jest.Mock;
	getAllFromIndex: jest.Mock;
	delete: jest.Mock;
	transaction: jest.Mock;
	close: jest.Mock;
	version: number;
	name: string;
	objectStoreNames: string[];
}

export interface MockDatabaseSetup {
	mockDbWrapper: jest.Mocked<IndexedDBWrapper>;
	mockDb: MockIDBDatabase;
	cleanup: () => void;
}

/**
 * Creates a properly initialized mock IndexedDB wrapper for testing
 * This ensures that the database appears to be initialized and ready for use
 */
export function createMockDatabaseSetup(): MockDatabaseSetup {
	// Create mock database instance
	const mockDb = {
		getAll: jest.fn().mockResolvedValue([]),
		put: jest.fn().mockResolvedValue(undefined),
		get: jest.fn().mockResolvedValue(undefined),
		getAllFromIndex: jest.fn().mockResolvedValue([]),
		delete: jest.fn().mockResolvedValue(undefined),
		transaction: jest.fn().mockReturnValue({
			objectStore: jest.fn().mockReturnValue({
				clear: jest.fn().mockResolvedValue(undefined),
				put: jest.fn().mockResolvedValue(undefined),
				get: jest.fn().mockResolvedValue(undefined),
				delete: jest.fn().mockResolvedValue(undefined),
			}),
		}),
		close: jest.fn(),
		version: 1,
		name: "test-monolog-live",
		objectStoreNames: ["sessions", "preferences", "audioFiles", "summaries"],
	};

	// Create mock IndexedDB wrapper
	const mockDbWrapper = {
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
		db: mockDb,
	} as unknown as jest.Mocked<IndexedDBWrapper>;

	// Ensure the mock db property is accessible and appears initialized
	Object.defineProperty(mockDbWrapper, "db", {
		value: mockDb,
		writable: true,
		configurable: true,
		enumerable: true,
	});

	// Mock the private initialization state to appear as if database is ready
	(
		mockDbWrapper as unknown as { initializationPromise: Promise<void> }
	).initializationPromise = Promise.resolve();

	const cleanup = () => {
		jest.clearAllMocks();
	};

	return {
		mockDbWrapper,
		mockDb,
		cleanup,
	};
}

/**
 * Creates mock audio files for testing
 */
export function createMockAudioFiles(
	count: number,
	sessionId?: string,
): AudioFile[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `audio-file-${i}`,
		sessionId: sessionId || `session-${i}`,
		filename: `audio-${i}.webm`,
		format: "webm" as const,
		duration: 60 + i * 10,
		size: 1000000 + i * 100000,
		createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // i days ago
		quality: {
			bitrate: 128000,
			sampleRate: 44100,
			channels: 1,
		},
	}));
}

/**
 * Creates mock sessions for testing
 */
export function createMockSessions(count: number, userId: string): Session[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `session-${i}`,
		userId,
		startTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
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
}

/**
 * Sets up mock database responses for audio file operations
 */
export function setupAudioFileOperationMocks(
	mockDbWrapper: jest.Mocked<IndexedDBWrapper>,
	audioFiles: AudioFile[],
	sessions: Session[],
): void {
	// Mock session retrieval
	mockDbWrapper.getSessionsByUser.mockImplementation(async (userId: string) => {
		return sessions.filter((session) => session.userId === userId);
	});

	// Mock audio file retrieval by session
	mockDbWrapper.getAudioFilesBySession.mockImplementation(
		async (sessionId: string) => {
			return audioFiles.filter((file) => file.sessionId === sessionId);
		},
	);

	// Mock individual audio file retrieval
	mockDbWrapper.getAudioFile.mockImplementation(async (fileId: string) => {
		return audioFiles.find((file) => file.id === fileId);
	});

	// Mock audio file deletion
	mockDbWrapper.deleteAudioFile.mockResolvedValue(undefined);

	// Mock audio file saving
	mockDbWrapper.saveAudioFile.mockResolvedValue(undefined);
}
