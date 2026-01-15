import type { IndexedDBWrapper } from "../storage/indexeddb-wrapper";
import type { Session } from "../types/core";

export interface SessionFilter {
	userId: string;
	startDate?: Date;
	endDate?: Date;
	isFavorite?: boolean;
	searchQuery?: string;
}

export class SessionHistoryManager {
	constructor(private db: IndexedDBWrapper) {}

	async getSessions(filter: SessionFilter): Promise<Session[]> {
		const sessions = await this.db.getSessionsByUser(filter.userId);

		return sessions.filter((session) => {
			// Date filter
			if (filter.startDate && session.startTime < filter.startDate) {
				return false;
			}

			// For end date, we'll assume inclusive if it's the exact same time,
			// but effectively it acts as a boundary.
			if (filter.endDate && session.startTime > filter.endDate) {
				return false;
			}

			// Favorite filter
			if (filter.isFavorite !== undefined) {
				// If filter is looking for favorites (true), session must be true.
				// If filter is looking for non-favorites (false), session must be false/undefined.
				const isFav = !!session.isFavorite;
				if (isFav !== filter.isFavorite) return false;
			}

			// Search query
			if (filter.searchQuery) {
				const query = filter.searchQuery.toLowerCase();
				const titleMatch = session.title?.toLowerCase().includes(query);
				const transcriptMatch = session.transcript.some((segment) =>
					segment.text.toLowerCase().includes(query),
				);

				if (!titleMatch && !transcriptMatch) return false;
			}

			return true;
		});
	}
}
