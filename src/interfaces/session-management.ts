// Session management interfaces

import type { ActivityEvent, Session, SessionSummary } from "../types/core.js";

export interface SessionManager {
	startSession(userId: string, topic?: string): Session;
	endSession(sessionId: string): Promise<SessionSummary>;
	trackActivity(sessionId: string, activity: ActivityEvent): void;
	generateSummary(session: Session): Promise<SessionSummary>;
	getCurrentSession(userId: string): Session | null;
}
