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

	async initialize(): Promise<void> {
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
	}

	// Session operations
	async saveSession(session: Session): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");
		await this.db.put("sessions", session);
	}

	async getSession(sessionId: string): Promise<Session | undefined> {
		if (!this.db) throw new Error("Database not initialized");
		return await this.db.get("sessions", sessionId);
	}

	async getSessionsByUser(userId: string): Promise<Session[]> {
		if (!this.db) throw new Error("Database not initialized");
		return await this.db.getAllFromIndex("sessions", "by-user", userId);
	}

	async deleteSession(sessionId: string): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");
		await this.db.delete("sessions", sessionId);
	}

	// User preferences operations
	async savePreferences(
		userId: string,
		preferences: UserPreferences,
	): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");
		const preferencesWithId = { ...preferences, userId };
		await this.db.put("preferences", preferencesWithId);
	}

	async getPreferences(userId: string): Promise<UserPreferences | undefined> {
		if (!this.db) throw new Error("Database not initialized");
		return await this.db.get("preferences", userId);
	}

	// Audio file operations
	async saveAudioFile(audioFile: AudioFile & { blob?: Blob }): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");
		await this.db.put("audioFiles", audioFile);
	}

	async getAudioFile(
		fileId: string,
	): Promise<(AudioFile & { blob?: Blob }) | undefined> {
		if (!this.db) throw new Error("Database not initialized");
		return await this.db.get("audioFiles", fileId);
	}

	async getAudioFilesBySession(
		sessionId: string,
	): Promise<(AudioFile & { blob?: Blob })[]> {
		if (!this.db) throw new Error("Database not initialized");
		return await this.db.getAllFromIndex("audioFiles", "by-session", sessionId);
	}

	async deleteAudioFile(fileId: string): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");
		await this.db.delete("audioFiles", fileId);
	}

	// Summary operations
	async saveSummary(summary: SessionSummary): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");
		await this.db.put("summaries", summary);
	}

	async getSummary(sessionId: string): Promise<SessionSummary | undefined> {
		if (!this.db) throw new Error("Database not initialized");
		return await this.db.get("summaries", sessionId);
	}

	// Utility operations
	async clearAllData(): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");
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
