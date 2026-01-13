// Session management interfaces

import type { ActivityEvent, Session, SessionSummary } from "../types/core.js";

export interface SessionManager {
	startSession(userId: string, topic?: string): Session;
	endSession(sessionId: string, apiKey?: string): Promise<SessionSummary>;
	trackActivity(sessionId: string, activity: ActivityEvent): void;
	generateSummary(session: Session, apiKey?: string): Promise<SessionSummary>;
	getCurrentSession(userId: string): Session | null;
}
