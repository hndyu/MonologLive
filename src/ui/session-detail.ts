import { LocalAudioManager } from "../audio/audio-manager.js";
import type { IndexedDBWrapper } from "../storage/indexeddb-wrapper.js";
import { MarkdownExporter } from "../summary/markdown-exporter.js";
import type { Session, SessionSummary } from "../types/core.js";
import "./session-detail.css";

export class SessionDetailView {
	private container: HTMLElement;
	private session: Session;
	private storage: IndexedDBWrapper;
	private audioManager: LocalAudioManager;
	private onBack: () => void;
	private audio: HTMLAudioElement | null = null;
	private isPlaying = false;
	private transcriptElements: HTMLElement[] = [];
	private summary: SessionSummary | null = null;
	private exporter: MarkdownExporter;

	constructor(
		container: HTMLElement,
		session: Session,
		storage: IndexedDBWrapper,
		onBack: () => void,
	) {
		this.container = container;
		this.session = session;
		this.storage = storage;
		this.audioManager = new LocalAudioManager(storage);
		this.onBack = onBack;
		this.exporter = new MarkdownExporter();
		this.render();
		this.loadAudio();
		this.loadSummary();
	}

	private render() {
		const dateStr = new Date(this.session.startTime).toLocaleString();
		const durationMs = this.session.metrics.totalDuration || 0;
		const durationMin = Math.floor(durationMs / 60000);

		this.container.innerHTML = `
            <div class="session-detail-container">
                <div class="detail-header">
                    <button id="detail-back-btn" class="back-btn">←</button>
                    <div class="detail-title">
                        <h3 id="session-title-text" class="editable-title">${this.session.title || "Untitled Session"} ✎</h3>
                        <div class="detail-date">${dateStr} • ${durationMin} min</div>
                    </div>
                    <div class="detail-actions">
                        <button id="detail-fav-btn" class="icon-btn favorite ${this.session.isFavorite ? "active" : ""}">
                            ${this.session.isFavorite ? "★" : "☆"}
                        </button>
                        <button id="detail-delete-btn" class="icon-btn delete">🗑️</button>
                    </div>
                </div>

                <div class="audio-player-container">
                    <button id="play-pause-btn" class="play-pause-btn" disabled>▶</button>
                    <div class="progress-container">
                        <span id="current-time" class="time-display">0:00</span>
                        <div id="progress-bar" class="progress-bar">
                            <div id="progress-fill" class="progress-fill"></div>
                        </div>
                        <span id="total-time" class="time-display">--:--</span>
                    </div>
                    <div class="export-actions">
                        <button id="export-audio-btn" class="btn btn-secondary btn-sm" title="Download Audio">🎵 Export</button>
                        <button id="export-md-btn" class="btn btn-secondary btn-sm" title="Download Markdown">📄 Export</button>
                    </div>
                </div>

                <div class="summary-section">
                    <div class="summary-text" id="session-summary-text">Loading summary...</div>
                    <div class="topics-list" id="session-topics"></div>
                </div>

                <div class="transcript-section" id="transcript-container">
                    <!-- Transcript segments -->
                </div>
            </div>
        `;

		this.attachEventListeners();
		this.renderTranscript();
	}

	private async loadSummary() {
		const summaryEl = this.container.querySelector("#session-summary-text");
		const topicsEl = this.container.querySelector("#session-topics");

		try {
			this.summary = (await this.storage.getSummary(this.session.id)) || null;

			if (this.summary && summaryEl) {
				summaryEl.textContent = this.summary.overallSummary;

				if (topicsEl) {
					topicsEl.innerHTML = "";
					this.summary.topics.forEach((topic) => {
						const tag = document.createElement("span");
						tag.className = "topic-tag";
						tag.textContent = topic.name;
						topicsEl.appendChild(tag);
					});
				}
			} else if (summaryEl) {
				summaryEl.textContent = "No summary available for this session.";
			}
		} catch (e) {
			console.error("Error loading summary", e);
			if (summaryEl) summaryEl.textContent = "Error loading summary.";
		}
	}

	private renderTranscript() {
		const container = this.container.querySelector("#transcript-container");
		if (!container) return;

		container.innerHTML = "";
		this.transcriptElements = [];

		const sorted = [...this.session.transcript].sort(
			(a, b) => a.start - b.start,
		);

		sorted.forEach((segment, index) => {
			const el = document.createElement("div");
			el.className = "transcript-segment";
			el.dataset.index = index.toString();

			// Handle legacy data where start time was stored as absolute UNIX timestamp
			const sessionStartTime = new Date(this.session.startTime).getTime();
			let relativeStart = segment.start;
			if (segment.start > sessionStartTime) {
				relativeStart = segment.start - sessionStartTime;
			}

			el.dataset.start = relativeStart.toString();
			el.dataset.end = (
				segment.end > sessionStartTime
					? segment.end - sessionStartTime
					: segment.end
			).toString();

			const startTimeStr = this.formatTime(relativeStart / 1000);

			el.innerHTML = `
                <div class="segment-time">${startTimeStr}</div>
                <div class="segment-text" contenteditable="true" spellcheck="true">${segment.text}</div>
            `;

			const textEl = el.querySelector(".segment-text") as HTMLElement;

			// Prevent seeking when clicking the text to edit, but still allow focus
			textEl.addEventListener("click", (e) => {
				e.stopPropagation();
			});

			// Save changes on blur
			textEl.addEventListener("blur", () => {
				const newText = textEl.innerText.trim();
				if (newText !== segment.text) {
					segment.text = newText;
					this.storage
						.updateSessionTranscript(this.session.id, this.session.transcript)
						.catch((err) => {
							console.error("Failed to update transcript", err);
							// Optional: revert text or show error UI
						});
				}
			});

			// Handle Enter key to blur (finish editing)
			textEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					textEl.blur();
				}
				if (e.key === "Escape") {
					textEl.innerText = segment.text; // Revert
					textEl.blur();
				}
			});

			el.addEventListener("click", () => {
				if (this.audio) {
					let seekTime = relativeStart / 1000;

					// Safety check against duration
					let duration = this.audio.duration;
					if (duration === Infinity || isNaN(duration)) {
						duration = (this.session.metrics.totalDuration || 0) / 1000;
					}

					if (seekTime > duration) {
						seekTime = duration;
					}

					this.audio.currentTime = Math.max(0, seekTime);
					if (!this.isPlaying) this.togglePlay();
				}
			});

			container.appendChild(el);
			this.transcriptElements.push(el);
		});
	}

	private attachEventListeners() {
		const backBtn = this.container.querySelector("#detail-back-btn");
		backBtn?.addEventListener("click", () => this.onBack());

		const playBtn = this.container.querySelector("#play-pause-btn");
		playBtn?.addEventListener("click", () => this.togglePlay());

		const progressBar = this.container.querySelector(
			"#progress-bar",
		) as HTMLElement;
		progressBar?.addEventListener("click", (e) => this.seek(e));

		// Management Actions
		const favBtn = this.container.querySelector("#detail-fav-btn");
		favBtn?.addEventListener("click", () => this.toggleFavorite());

		const deleteBtn = this.container.querySelector("#detail-delete-btn");
		deleteBtn?.addEventListener("click", () => this.deleteSession());

		const titleText = this.container.querySelector("#session-title-text");
		titleText?.addEventListener("click", () => this.renameSession());

		// Export Actions
		const exportMdBtn = this.container.querySelector("#export-md-btn");
		exportMdBtn?.addEventListener("click", () => this.exportMarkdown());

		const exportAudioBtn = this.container.querySelector("#export-audio-btn");
		exportAudioBtn?.addEventListener("click", () => this.exportAudio());
	}

	private async toggleFavorite() {
		const newStatus = !this.session.isFavorite;
		await this.storage.updateSessionMetadata(this.session.id, {
			isFavorite: newStatus,
		});
		this.session.isFavorite = newStatus;

		const favBtn = this.container.querySelector("#detail-fav-btn");
		if (favBtn) {
			favBtn.classList.toggle("active", newStatus);
			favBtn.textContent = newStatus ? "★" : "☆";
		}
	}

	private async deleteSession() {
		if (
			confirm(
				"Are you sure you want to delete this session? This action cannot be undone.",
			)
		) {
			await this.storage.deleteSession(this.session.id);
			this.onBack();
		}
	}

	private async renameSession() {
		const newTitle = prompt(
			"Enter new title for this session:",
			this.session.title || "",
		);
		if (newTitle !== null && newTitle.trim() !== "") {
			await this.storage.updateSessionMetadata(this.session.id, {
				title: newTitle.trim(),
			});
			this.session.title = newTitle.trim();

			const titleText = this.container.querySelector("#session-title-text");
			if (titleText) titleText.innerHTML = `${this.session.title} ✎`;
		}
	}

	private exportMarkdown() {
		if (!this.summary) {
			alert("No summary available to export. Full transcript will be used.");
			// Fallback: create a dummy summary for the exporter
			const fallbackSummary: SessionSummary = {
				sessionId: this.session.id,
				overallSummary: "Full transcript export.",
				topics: [],
				insights: [],
				generatedAt: new Date(),
			};
			const fullTranscript = this.session.transcript
				.map((s) => s.text)
				.join("\n");
			this.exporter.downloadAsFile(fallbackSummary, fullTranscript);
			return;
		}

		const fullTranscript = this.session.transcript
			.map((s) => s.text)
			.join("\n");
		this.exporter.downloadAsFile(this.summary, fullTranscript);
	}

	private async exportAudio() {
		try {
			const files = await this.audioManager.getAudioFilesBySession(
				this.session.id,
			);
			if (files.length > 0 && files[0].blob) {
				const url = URL.createObjectURL(files[0].blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = `session-${this.session.id}.webm`;
				document.body.appendChild(link);
				link.click();
				setTimeout(() => {
					document.body.removeChild(link);
					URL.revokeObjectURL(url);
				}, 100);
			} else {
				alert("No audio file found for this session.");
			}
		} catch (e) {
			console.error("Export audio failed", e);
		}
	}

	private async loadAudio() {
		try {
			const files = await this.audioManager.getAudioFilesBySession(
				this.session.id,
			);
			if (files.length > 0 && files[0].blob) {
				const url = URL.createObjectURL(files[0].blob);
				this.audio = new Audio(url);

				this.audio.addEventListener("loadedmetadata", () => {
					const totalTimeEl = this.container.querySelector("#total-time");
					if (totalTimeEl && this.audio) {
						let duration = this.audio.duration;
						if (duration === Infinity || isNaN(duration)) {
							duration = (this.session.metrics.totalDuration || 0) / 1000;
						}
						totalTimeEl.textContent = this.formatTime(duration);
					}
					const playBtn = this.container.querySelector(
						"#play-pause-btn",
					) as HTMLButtonElement;
					if (playBtn) playBtn.disabled = false;
				});

				this.audio.addEventListener("ended", () => {
					this.isPlaying = false;
					this.updatePlayButton();
				});
			} else {
				console.warn("No audio file found for session");
			}
		} catch (error) {
			console.error("Failed to load audio", error);
		}
	}

	private togglePlay() {
		if (!this.audio) return;

		if (this.isPlaying) {
			this.audio.pause();
			this.isPlaying = false;
		} else {
			this.audio.play();
			this.isPlaying = true;
			this.startProgressLoop();
		}
		this.updatePlayButton();
	}

	private updatePlayButton() {
		const btn = this.container.querySelector("#play-pause-btn");
		if (btn) btn.textContent = this.isPlaying ? "⏸" : "▶";
	}

	private startProgressLoop() {
		if (!this.isPlaying || !this.audio) return;

		const update = () => {
			if (!this.isPlaying || !this.audio) return;

			const current = this.audio.currentTime;
			let duration = this.audio.duration;
			if (duration === Infinity || isNaN(duration)) {
				duration = (this.session.metrics.totalDuration || 0) / 1000;
			}
			if (duration <= 0) duration = 1;

			const percent = (current / duration) * 100;

			const fill = this.container.querySelector(
				"#progress-fill",
			) as HTMLElement;
			if (fill) fill.style.width = `${percent}%`;

			const timeDisplay = this.container.querySelector("#current-time");
			if (timeDisplay) timeDisplay.textContent = this.formatTime(current);

			this.highlightTranscript(current * 1000); // ms

			requestAnimationFrame(update);
		};
		requestAnimationFrame(update);
	}

	private highlightTranscript(timeMs: number) {
		this.transcriptElements.forEach((el) => {
			const start = parseFloat(el.dataset.start || "0");
			const end = parseFloat(el.dataset.end || "0");

			if (timeMs >= start && (timeMs < end || end === start)) {
				el.classList.add("active");
				this.ensureVisible(el);
			} else {
				el.classList.remove("active");
			}
		});
	}

	private ensureVisible(el: HTMLElement) {
		if (document.activeElement?.classList.contains("segment-text")) return;

		el.scrollIntoView({
			behavior: "smooth",
			block: "nearest",
		});
	}

	private seek(e: MouseEvent) {
		if (!this.audio) return;

		const progressBar = e.currentTarget as HTMLElement;
		const rect = progressBar.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const width = rect.width;
		const percent = Math.max(0, Math.min(1, x / width));

		let duration = this.audio.duration;
		if (duration === Infinity || isNaN(duration)) {
			duration = (this.session.metrics.totalDuration || 0) / 1000;
		}

		this.audio.currentTime = percent * duration;

		if (!this.isPlaying) {
			const fill = this.container.querySelector(
				"#progress-fill",
			) as HTMLElement;
			if (fill) fill.style.width = `${percent * 100}%`;
			const timeDisplay = this.container.querySelector("#current-time");
			if (timeDisplay)
				timeDisplay.textContent = this.formatTime(this.audio.currentTime);
		}
	}

	private formatTime(seconds: number): string {
		if (isNaN(seconds) || seconds === Infinity) {
			return "--:--";
		}
		const totalSeconds = Math.max(0, Math.floor(seconds));
		const m = Math.floor(totalSeconds / 60);
		const s = totalSeconds % 60;
		return `${m}:${s.toString().padStart(2, "0")}`;
	}

	public destroy() {
		if (this.audio) {
			this.audio.pause();
			this.audio = null;
		}
		this.isPlaying = false;
	}
}
