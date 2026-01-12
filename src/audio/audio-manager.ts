// Audio file management and storage system

import type { AudioManager } from "../interfaces/audio-recording.js";
import type { IndexedDBWrapper } from "../storage/indexeddb-wrapper.js";
import type { AudioFile, StorageInfo } from "../types/core.js";

export class LocalAudioManager implements AudioManager {
	private dbWrapper: IndexedDBWrapper;
	private readonly MAX_STORAGE_MB = 500; // 500MB default limit
	private readonly CLEANUP_THRESHOLD = 0.9; // Cleanup when 90% full
	private initializationPromise: Promise<void> | null = null;

	constructor(dbWrapper: IndexedDBWrapper) {
		this.dbWrapper = dbWrapper;
		this.initializationPromise = this.ensureInitialized();
	}

	private async ensureInitialized(): Promise<void> {
		try {
			// Check if database is already initialized
			if (this.dbWrapper.isInitialized()) {
				return;
			}

			// Initialize the database if not already done
			await this.dbWrapper.initialize();
		} catch (error) {
			console.warn(
				"Database initialization failed, using fallback mode:",
				error,
			);
			// In test environment or when IndexedDB is not available,
			// we'll continue with mock functionality
		}
	}

	private async waitForInitialization(): Promise<void> {
		if (this.initializationPromise) {
			await this.initializationPromise;
		}
	}

	async saveAudioFile(audio: AudioFile, sessionId: string): Promise<string> {
		try {
			// Ensure database is initialized
			await this.waitForInitialization();

			// Set the session ID
			const audioWithSession = { ...audio, sessionId };

			// Check storage quota before saving
			const storageInfo = await this.getStorageUsage();
			const audioSizeMB = audio.size / (1024 * 1024);

			if (storageInfo.used + audioSizeMB > this.MAX_STORAGE_MB) {
				// Attempt cleanup first
				const cleanedCount = await this.cleanupOldFiles(30); // 30 days
				console.log(`Cleaned up ${cleanedCount} old audio files`);

				// Check again after cleanup
				const newStorageInfo = await this.getStorageUsage();
				if (newStorageInfo.used + audioSizeMB > this.MAX_STORAGE_MB) {
					throw new Error("Insufficient storage space for audio file");
				}
			}

			// Save audio file metadata to IndexedDB
			await this.dbWrapper.saveAudioFile(audioWithSession);

			// Save audio blob data to IndexedDB as well (for local storage)
			if (audio.blob) {
				await this.saveAudioBlob(audio.id, audio.blob);
			}

			return audio.id;
		} catch (error) {
			throw new Error(
				`Failed to save audio file: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	async getAudioFiles(userId: string): Promise<AudioFile[]> {
		try {
			// Ensure database is initialized
			await this.waitForInitialization();

			// Get all sessions for the user first
			const sessions = await this.dbWrapper.getSessionsByUser(userId);
			const sessionIds = sessions.map((session) => session.id);

			// Get audio files for all user sessions
			const allAudioFiles: AudioFile[] = [];
			for (const sessionId of sessionIds) {
				const sessionAudioFiles =
					await this.dbWrapper.getAudioFilesBySession(sessionId);
				allAudioFiles.push(...sessionAudioFiles);
			}

			// Sort by creation date (newest first)
			return allAudioFiles.sort(
				(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
			);
		} catch (error) {
			throw new Error(
				`Failed to retrieve audio files: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	async deleteAudioFile(fileId: string): Promise<boolean> {
		try {
			// Ensure database is initialized
			await this.waitForInitialization();

			// Delete audio blob data
			await this.deleteAudioBlob(fileId);

			// Delete audio file metadata
			await this.dbWrapper.deleteAudioFile(fileId);

			return true;
		} catch (error) {
			console.error(`Failed to delete audio file ${fileId}:`, error);
			return false;
		}
	}

	async getStorageUsage(): Promise<StorageInfo> {
		try {
			const estimate = await this.dbWrapper.getStorageEstimate();
			const usageMB = estimate.usage / (1024 * 1024);
			const quotaMB = estimate.quota / (1024 * 1024);

			return {
				used: usageMB,
				available: quotaMB - usageMB,
				quota: quotaMB,
			};
		} catch (error) {
			console.error("Failed to get storage usage:", error);
			return {
				used: 0,
				available: this.MAX_STORAGE_MB,
				quota: this.MAX_STORAGE_MB,
			};
		}
	}

	async cleanupOldFiles(maxAgeInDays: number): Promise<number> {
		try {
			// Ensure database is initialized
			await this.waitForInitialization();

			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

			// Get all audio files (we'll need to iterate through all users)
			const allAudioFiles = await this.getAllAudioFiles();

			let deletedCount = 0;
			for (const audioFile of allAudioFiles) {
				if (audioFile.createdAt < cutoffDate) {
					const deleted = await this.deleteAudioFile(audioFile.id);
					if (deleted) {
						deletedCount++;
					}
				}
			}

			return deletedCount;
		} catch (error) {
			console.error("Failed to cleanup old files:", error);
			return 0;
		}
	}

	// Additional utility methods

	async getAudioFilesBySession(sessionId: string): Promise<AudioFile[]> {
		try {
			// Ensure database is initialized
			await this.waitForInitialization();

			return await this.dbWrapper.getAudioFilesBySession(sessionId);
		} catch (error) {
			throw new Error(
				`Failed to get audio files for session: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	async getAudioBlob(fileId: string): Promise<Blob | null> {
		try {
			// Ensure database is initialized
			await this.waitForInitialization();

			const audioFile = await this.dbWrapper.getAudioFile(fileId);
			return audioFile?.blob || null;
		} catch (error) {
			console.error(`Failed to get audio blob for ${fileId}:`, error);
			return null;
		}
	}

	private async saveAudioBlob(fileId: string, blob: Blob): Promise<void> {
		try {
			// Ensure database is initialized
			await this.waitForInitialization();

			const isDbAvailable = this.dbWrapper.isInitialized();
			if (!isDbAvailable) {
				console.warn("Database not available, skipping blob save");
				return;
			}

			// We need to add audioBlobs store to the IndexedDB schema
			// For now, we'll store it as part of the audio file metadata
			// This is a simplified approach - in production, you might want a separate store
			const audioFile = await this.dbWrapper.getAudioFile(fileId);
			if (audioFile) {
				audioFile.blob = blob;
				await this.dbWrapper.saveAudioFile(audioFile);
			}
		} catch (error) {
			console.error(`Failed to save audio blob for ${fileId}:`, error);
		}
	}

	private async deleteAudioBlob(_fileId: string): Promise<void> {
		// Since we're storing blobs with the audio file metadata,
		// they'll be deleted when the audio file is deleted
		// This is a placeholder for more sophisticated blob storage
	}

	private async getAllAudioFiles(): Promise<AudioFile[]> {
		try {
			// Ensure database is initialized
			await this.waitForInitialization();

			// This requires a new method in IndexedDBWrapper
			return await this.dbWrapper.getAllAudioFiles();
		} catch (error) {
			console.error("Failed to get all audio files:", error);
			return [];
		}
	}

	// Storage monitoring
	async isStorageQuotaExceeded(): Promise<boolean> {
		const storageInfo = await this.getStorageUsage();
		return storageInfo.used / storageInfo.quota > this.CLEANUP_THRESHOLD;
	}

	async getStorageStats(): Promise<{
		totalFiles: number;
		totalSizeMB: number;
		oldestFile: Date | null;
		newestFile: Date | null;
	}> {
		try {
			const allFiles = await this.getAllAudioFiles();

			if (allFiles.length === 0) {
				return {
					totalFiles: 0,
					totalSizeMB: 0,
					oldestFile: null,
					newestFile: null,
				};
			}

			const totalSizeMB =
				allFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
			const dates = allFiles.map((file) => file.createdAt);
			const oldestFile = new Date(Math.min(...dates.map((d) => d.getTime())));
			const newestFile = new Date(Math.max(...dates.map((d) => d.getTime())));

			return {
				totalFiles: allFiles.length,
				totalSizeMB,
				oldestFile,
				newestFile,
			};
		} catch (error) {
			console.error("Failed to get storage stats:", error);
			return {
				totalFiles: 0,
				totalSizeMB: 0,
				oldestFile: null,
				newestFile: null,
			};
		}
	}
}
