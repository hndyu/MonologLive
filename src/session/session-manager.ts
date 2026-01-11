// Session lifecycle management implementation

import type { SessionManager } from "../interfaces/session-management.js";
import type { SummaryGenerator } from "../interfaces/summary-generation.js";
import type { IndexedDBWrapper } from "../storage/indexeddb-wrapper.js";
import type {
	ActivityEvent,
	Comment,
	Session,
	SessionSummary,
	TranscriptSegment,
	UserInteraction,
} from "../types/core.js";

export class SessionManagerImpl implements SessionManager {
	private activeSessions: Map<string, Session> = new Map();
	private storage: IndexedDBWrapper;
	private summaryGenerator: SummaryGenerator;

	constructor(storage: IndexedDBWrapper, summaryGenerator: SummaryGenerator) {
		this.storage = storage;
		this.summaryGenerator = summaryGenerator;
	}

	startSession(userId: string, topic?: string): Session {
		const sessionId = this.generateSessionId();
		const session: Session = {
			id: sessionId,
			userId,
			startTime: new Date(),
			topic,
			transcript: [],
			comments: [],
			interactions: [],
			metrics: {
				totalDuration: 0,
				commentCount: 0,
				interactionCount: 0,
				averageEngagement: 0,
			},
		};

		this.activeSessions.set(userId, session);

		// Store session in IndexedDB immediately
		this.storage.saveSession(session).catch((error) => {
			console.error("Failed to save session to storage:", error);
		});

		return session;
	}

	async endSession(sessionId: string): Promise<SessionSummary> {
		const session = await this.getSessionById(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		// Mark session as ended
		session.endTime = new Date();
		session.metrics.totalDuration =
			session.endTime.getTime() - session.startTime.getTime();

		// Calculate final metrics
		this.updateSessionMetrics(session);

		// Save updated session
		await this.storage.saveSession(session);

		// Remove from active sessions
		this.activeSessions.delete(session.userId);

		// Generate summary
		const summary = await this.generateSummary(session);

		// Save summary to storage
		await this.storage.saveSummary(summary);

		return summary;
	}

	trackActivity(sessionId: string, activity: ActivityEvent): void {
		const session = this.getActiveSessionById(sessionId);
		if (!session) {
			console.warn(`Cannot track activity for inactive session: ${sessionId}`);
			return;
		}

		// Update session based on activity type
		switch (activity.type) {
			case "speech":
				this.handleSpeechActivity(session, activity);
				break;
			case "comment":
				this.handleCommentActivity(session, activity);
				break;
			case "interaction":
				this.handleInteractionActivity(session, activity);
				break;
			case "silence":
				this.handleSilenceActivity(session, activity);
				break;
		}

		// Update metrics
		this.updateSessionMetrics(session);

		// Persist session changes
		this.storage.saveSession(session).catch((error) => {
			console.error("Failed to save session activity:", error);
		});
	}

	async generateSummary(session: Session): Promise<SessionSummary> {
		return await this.summaryGenerator.createSummary(session);
	}

	getCurrentSession(userId: string): Session | null {
		return this.activeSessions.get(userId) || null;
	}

	// Additional helper methods

	async getSessionById(sessionId: string): Promise<Session | null> {
		// First check active sessions
		for (const session of this.activeSessions.values()) {
			if (session.id === sessionId) {
				return session;
			}
		}

		// Then check storage
		const storedSession = await this.storage.getSession(sessionId);
		return storedSession || null;
	}

	async getUserSessions(userId: string): Promise<Session[]> {
		return await this.storage.getSessionsByUser(userId);
	}

	addTranscriptSegment(sessionId: string, segment: TranscriptSegment): void {
		const session = this.getActiveSessionById(sessionId);
		if (session) {
			session.transcript.push(segment);
		}
	}

	addComment(sessionId: string, comment: Comment): void {
		const session = this.getActiveSessionById(sessionId);
		if (session) {
			session.comments.push(comment);
			session.metrics.commentCount++;
		}
	}

	addUserInteraction(sessionId: string, interaction: UserInteraction): void {
		const session = this.getActiveSessionById(sessionId);
		if (session) {
			session.interactions.push(interaction);
			session.metrics.interactionCount++;
		}
	}

	private getActiveSessionById(sessionId: string): Session | null {
		for (const session of this.activeSessions.values()) {
			if (session.id === sessionId) {
				return session;
			}
		}
		return null;
	}

	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private handleSpeechActivity(
		session: Session,
		activity: ActivityEvent,
	): void {
		// Add transcript segment if provided
		const data = activity.data as any;
		if (data?.transcript) {
			const segment: TranscriptSegment = {
				start: activity.timestamp.getTime() - session.startTime.getTime(),
				end:
					activity.timestamp.getTime() -
					session.startTime.getTime() +
					(activity.duration || 0),
				text: data.transcript,
				confidence: data.confidence || 1.0,
				isFinal: data.isFinal || true,
			};
			session.transcript.push(segment);
		}
	}

	private handleCommentActivity(
		session: Session,
		activity: ActivityEvent,
	): void {
		const data = activity.data as any;
		if (data?.comment) {
			session.comments.push(data.comment);
			session.metrics.commentCount++;
		}
	}

	private handleInteractionActivity(
		session: Session,
		activity: ActivityEvent,
	): void {
		const data = activity.data as any;
		if (data?.interaction) {
			session.interactions.push(data.interaction);
			session.metrics.interactionCount++;
		}
	}

	private handleSilenceActivity(
		_session: Session,
		_activity: ActivityEvent,
	): void {
		// Track silence periods for engagement analysis
		// This could be used for adaptive comment generation
	}

	private updateSessionMetrics(session: Session): void {
		const now = new Date();
		const currentDuration = session.endTime
			? session.endTime.getTime() - session.startTime.getTime()
			: now.getTime() - session.startTime.getTime();

		session.metrics.totalDuration = currentDuration;

		// Calculate average engagement based on interactions per minute
		const durationMinutes = currentDuration / (1000 * 60);
		session.metrics.averageEngagement =
			durationMinutes > 0
				? session.metrics.interactionCount / durationMinutes
				: 0;
	}
}

// Export both the interface and implementation for convenience
export type { SessionManager } from "../interfaces/session-management.js";
