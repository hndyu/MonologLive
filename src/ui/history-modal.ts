import { SessionHistoryManager } from "../session/session-history-manager.js";
import type { IndexedDBWrapper } from "../storage/indexeddb-wrapper.js";
import type { Session } from "../types/core.js";
import "./history-modal.css";

export class HistoryModal {
	private container: HTMLElement;
	private historyManager: SessionHistoryManager;
	private sessions: Session[] = [];
	private currentUserId = "default_user";
	private filter = {
		onlyFavorites: false,
		searchQuery: "",
	};

	constructor(mountPoint: HTMLElement, storage: IndexedDBWrapper) {
		this.container = mountPoint;
		this.historyManager = new SessionHistoryManager(storage);
		this.renderStructure();
		this.attachEventListeners();
	}

	public setUserId(userId: string) {
		this.currentUserId = userId;
	}

	public async refresh() {
		await this.loadSessions();
		this.renderList();
	}

	private async loadSessions() {
		try {
			this.sessions = await this.historyManager.getSessions({
				userId: this.currentUserId,
				isFavorite: this.filter.onlyFavorites ? true : undefined,
				searchQuery: this.filter.searchQuery || undefined,
			});
			// Sort by date descending (newest first)
			this.sessions.sort(
				(a, b) => b.startTime.getTime() - a.startTime.getTime(),
			);
		} catch (error) {
			console.error("Failed to load sessions:", error);
			this.sessions = [];
		}
	}

	private renderStructure() {
		this.container.innerHTML = `
            <div class="history-modal-content">
                <div class="history-controls">
                    <input type="text" id="history-search" class="search-input" placeholder="Search sessions...">
                    <label class="filter-toggle">
                        <input type="checkbox" id="history-favorite-filter">
                        <span>Favorites only</span>
                    </label>
                </div>
                <div id="session-list" class="session-list">
                    <!-- Sessions will be injected here -->
                </div>
            </div>
        `;
	}

	private attachEventListeners() {
		const searchInput = this.container.querySelector(
			"#history-search",
		) as HTMLInputElement;
		const favFilter = this.container.querySelector(
			"#history-favorite-filter",
		) as HTMLInputElement;

		searchInput?.addEventListener("input", (e) => {
			this.filter.searchQuery = (e.target as HTMLInputElement).value;
			this.refresh();
		});

		favFilter?.addEventListener("change", (e) => {
			this.filter.onlyFavorites = (e.target as HTMLInputElement).checked;
			this.refresh();
		});
	}

	private renderList() {
		const listContainer = this.container.querySelector("#session-list");
		if (!listContainer) return;

		listContainer.innerHTML = "";

		if (this.sessions.length === 0) {
			listContainer.innerHTML = `
                <div class="empty-state">
                    No sessions found. Start recording to build your history!
                </div>
            `;
			return;
		}

		this.sessions.forEach((session) => {
			const item = document.createElement("div");
			item.className = "session-item";
			item.dataset.sessionId = session.id;

			const dateStr = new Date(session.startTime).toLocaleDateString(
				undefined,
				{
					year: "numeric",
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				},
			);

			const durationMs = session.metrics.totalDuration || 0;
			const durationMin = Math.floor(durationMs / 60000);
			const durationSec = Math.floor((durationMs % 60000) / 1000);
			const durationStr = `${durationMin}:${durationSec.toString().padStart(2, "0")}`;

			item.innerHTML = `
                <div class="session-info">
                    <div class="session-title">${session.title || "Untitled Session"}</div>
                    <div class="session-meta">
                        <span>📅 ${dateStr}</span>
                        <span>⏱️ ${durationStr}</span>
                        <span>💬 ${session.metrics.commentCount} comments</span>
                    </div>
                </div>
                <div class="session-actions">
                    <span class="icon-btn favorite ${session.isFavorite ? "active" : ""}">
                        ${session.isFavorite ? "★" : "☆"}
                    </span>
                </div>
            `;

			// Click handler for the item (excluding actions)
			item.addEventListener("click", (e) => {
				const target = e.target as HTMLElement;
				if (!target.closest(".session-actions")) {
					this.onSessionClick(session.id);
				}
			});

			listContainer.appendChild(item);
		});
	}

	private onSessionClick(sessionId: string) {
		console.log("Session clicked:", sessionId);
		// Phase 3: Open detail view
	}
}
