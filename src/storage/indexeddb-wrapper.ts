// IndexedDB wrapper for client-side storage

import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type {
	AudioFile,
	Session,
	SessionSummary,
	UserPreferences,
} from "../types/core.js";

interface MonologDB extends DBSchema {
	sessions: {
		key: string;
		value: Session;
		indexes: { "by-user": string; "by-date": Date };
	};
	preferences: {
		key: string;
		value: UserPreferences;
	};
	audioFiles: {
		key: string;
		value: AudioFile & { blob?: Blob };
		indexes: { "by-session": string; "by-date": Date };
	};
	summaries: {
		key: string;
		value: SessionSummary;
		indexes: { "by-session": string };
	};
}

export class IndexedDBWrapper {
	private db: IDBPDatabase<MonologDB> | null = null;
	private readonly dbName = "monolog-live";
	private readonly version = 1;
	private initializationPromise: Promise<void> | null = null;

	async initialize(): Promise<void> {
		// Prevent multiple initialization attempts
		if (this.initializationPromise) {
			return this.initializationPromise;
		}

		// If already initialized, return immediately
		if (this.db) {
			return Promise.resolve();
		}

		this.initializationPromise = this.performInitialization();
		return this.initializationPromise;
	}

	private async performInitialization(): Promise<void> {
		try {
			this.db = await openDB<MonologDB>(this.dbName, this.version, {
				upgrade(db) {
					// Sessions store
					const sessionStore = db.createObjectStore("sessions", {
						keyPath: "id",
					});
					sessionStore.createIndex("by-user", "userId");
					sessionStore.createIndex("by-date", "startTime");

					// User preferences store
					db.createObjectStore("preferences", { keyPath: "userId" });

					// Audio files store
					const audioStore = db.createObjectStore("audioFiles", {
						keyPath: "id",
					});
					audioStore.createIndex("by-session", "sessionId");
					audioStore.createIndex("by-date", "createdAt");

					// Summaries store
					const summaryStore = db.createObjectStore("summaries", {
						keyPath: "sessionId",
					});
					summaryStore.createIndex("by-session", "sessionId");
				},
			});
		} catch (error) {
			console.warn("IndexedDB initialization failed:", error);
			// In test environment or when IndexedDB is not available,
			// we'll set db to null and methods will handle gracefully
			this.db = null;
		}
	}

	private async ensureInitialized(): Promise<void> {
		if (!this.db && !this.initializationPromise) {
			await this.initialize();
		} else if (this.initializationPromise) {
			await this.initializationPromise;
		}
	}

	isInitialized(): boolean {
		return !!this.db;
	}

	// Session operations
	async saveSession(session: Session): Promise<void> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, skipping session save");
			return;
		}
		await this.db.put("sessions", session);
	}

	async getSession(sessionId: string): Promise<Session | undefined> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, returning undefined for session");
			return undefined;
		}
		return await this.db.get("sessions", sessionId);
	}

	async getSessionsByUser(userId: string): Promise<Session[]> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, returning empty sessions array");
			return [];
		}
		return await this.db.getAllFromIndex("sessions", "by-user", userId);
	}

	async updateSessionMetadata(
		sessionId: string,
		metadata: { title?: string; isFavorite?: boolean },
	): Promise<void> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, skipping session metadata update");
			return;
		}

		const tx = this.db.transaction("sessions", "readwrite");
		const store = tx.objectStore("sessions");
		const session = await store.get(sessionId);

		if (!session) {
			console.warn(`Session ${sessionId} not found`);
			return;
		}

		if (metadata.title !== undefined) {
			session.title = metadata.title;
		}

		if (metadata.isFavorite !== undefined) {
			session.isFavorite = metadata.isFavorite;
		}

		await store.put(session);
		await tx.done;
	}

	async deleteSession(sessionId: string): Promise<void> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, skipping session delete");
			return;
		}
		await this.db.delete("sessions", sessionId);
	}

	// User preferences operations
	async savePreferences(
		userId: string,
		preferences: UserPreferences,
	): Promise<void> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, skipping preferences save");
			return;
		}
		const preferencesWithId = { ...preferences, userId };
		await this.db.put("preferences", preferencesWithId);
	}

	async getPreferences(userId: string): Promise<UserPreferences | undefined> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn(
				"Database not available, returning undefined for preferences",
			);
			return undefined;
		}
		return await this.db.get("preferences", userId);
	}

	// Audio file operations
	async saveAudioFile(audioFile: AudioFile & { blob?: Blob }): Promise<void> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, skipping audio file save");
			return;
		}
		await this.db.put("audioFiles", audioFile);
	}

	async getAudioFile(
		fileId: string,
	): Promise<(AudioFile & { blob?: Blob }) | undefined> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn(
				"Database not available, returning undefined for audio file",
			);
			return undefined;
		}
		return await this.db.get("audioFiles", fileId);
	}

	async getAudioFilesBySession(
		sessionId: string,
	): Promise<(AudioFile & { blob?: Blob })[]> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, returning empty audio files array");
			return [];
		}
		return await this.db.getAllFromIndex("audioFiles", "by-session", sessionId);
	}

	async deleteAudioFile(fileId: string): Promise<void> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, skipping audio file delete");
			return;
		}
		await this.db.delete("audioFiles", fileId);
	}

	async getAllAudioFiles(): Promise<(AudioFile & { blob?: Blob })[]> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, returning empty array");
			return [];
		}
		return await this.db.getAll("audioFiles");
	}

	// Summary operations
	async saveSummary(summary: SessionSummary): Promise<void> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, skipping summary save");
			return;
		}
		await this.db.put("summaries", summary);
	}

	async getSummary(sessionId: string): Promise<SessionSummary | undefined> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, returning undefined for summary");
			return undefined;
		}
		return await this.db.get("summaries", sessionId);
	}

	// Utility operations
	async clearAllData(): Promise<void> {
		await this.ensureInitialized();
		if (!this.db) {
			console.warn("Database not available, skipping data clear");
			return;
		}
		const tx = this.db.transaction(
			["sessions", "preferences", "audioFiles", "summaries"],
			"readwrite",
		);
		await Promise.all([
			tx.objectStore("sessions").clear(),
			tx.objectStore("preferences").clear(),
			tx.objectStore("audioFiles").clear(),
			tx.objectStore("summaries").clear(),
		]);
	}

	async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
		if ("storage" in navigator && "estimate" in navigator.storage) {
			const estimate = await navigator.storage.estimate();
			return {
				usage: estimate.usage || 0,
				quota: estimate.quota || 0,
			};
		}
		return { usage: 0, quota: 0 };
	}

	async close(): Promise<void> {
		if (this.db) {
			this.db.close();
			this.db = null;
		}
	}

	// Backward compatibility methods for tests
	async saveUserPreferences(
		userId: string,
		preferences: UserPreferences,
	): Promise<void> {
		return this.savePreferences(userId, preferences);
	}

	async getUserPreferences(
		userId: string,
	): Promise<UserPreferences | undefined> {
		return this.getPreferences(userId);
	}
}
