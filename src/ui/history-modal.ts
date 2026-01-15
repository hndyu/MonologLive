import { SessionHistoryManager } from "../session/session-history-manager.js";
import type { IndexedDBWrapper } from "../storage/indexeddb-wrapper.js";
import type { Session } from "../types/core.js";
import { SessionDetailView } from "./session-detail.js";
import "./history-modal.css";

export class HistoryModal {
	private container: HTMLElement;
	private historyManager: SessionHistoryManager;
	private storage: IndexedDBWrapper;
	private sessions: Session[] = [];
	private currentUserId = "default_user";
	private filter = {
		onlyFavorites: false,
		searchQuery: "",
	};
	private currentDetailView: SessionDetailView | null = null;

	constructor(mountPoint: HTMLElement, storage: IndexedDBWrapper) {
		this.container = mountPoint;
		this.storage = storage;
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
            <div id="history-list-view" class="history-modal-content">
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
            <div id="history-detail-view" style="display: none; height: 100%;"></div>
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
					<button class="icon-btn favorite ${session.isFavorite ? "active" : ""}" title="Toggle favorite">
						${session.isFavorite ? "★" : "☆"}
					</button>
					<button class="icon-btn delete" title="Delete session">
						🗑️
					</button>
				</div>
			`;

			// Click handler for favorite
			const favBtn = item.querySelector(".favorite");
			favBtn?.addEventListener("click", async (e) => {
				e.stopPropagation();
				const newStatus = !session.isFavorite;
				await this.storage.updateSessionMetadata(session.id, {
					isFavorite: newStatus,
				});
				this.refresh();
			});

			// Click handler for delete
			const deleteBtn = item.querySelector(".delete");
			deleteBtn?.addEventListener("click", async (e) => {
				e.stopPropagation();
				if (
					confirm(
						"Are you sure you want to delete this session? This action cannot be undone.",
					)
				) {
					await this.storage.deleteSession(session.id);
					this.refresh();
				}
			});

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
		const session = this.sessions.find((s) => s.id === sessionId);
		if (!session) return;

		const listView = this.container.querySelector(
			"#history-list-view",
		) as HTMLElement;
		const detailViewContainer = this.container.querySelector(
			"#history-detail-view",
		) as HTMLElement;

		if (listView && detailViewContainer) {
			listView.style.display = "none";
			detailViewContainer.style.display = "block";
			detailViewContainer.innerHTML = "";

			if (this.currentDetailView) {
				this.currentDetailView.destroy();
			}

			this.currentDetailView = new SessionDetailView(
				detailViewContainer,
				session,
				this.storage,
				() => {
					// On Back
					if (this.currentDetailView) {
						this.currentDetailView.destroy();
						this.currentDetailView = null;
					}
					detailViewContainer.style.display = "none";
					listView.style.display = "flex";
				},
			);
		}
	}
}
