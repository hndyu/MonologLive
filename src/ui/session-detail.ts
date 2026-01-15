import { LocalAudioManager } from "../audio/audio-manager.js";
import type { IndexedDBWrapper } from "../storage/indexeddb-wrapper.js";
import type { Session } from "../types/core.js";
import "./session-detail.css";

export class SessionDetailView {
	private container: HTMLElement;
	private session: Session;
	private audioManager: LocalAudioManager;
	private onBack: () => void;
	private audio: HTMLAudioElement | null = null;
	private isPlaying = false;
	private transcriptElements: HTMLElement[] = [];

	constructor(
		container: HTMLElement,
		session: Session,
		storage: IndexedDBWrapper,
		onBack: () => void,
	) {
		this.container = container;
		this.session = session;
		this.audioManager = new LocalAudioManager(storage);
		this.onBack = onBack;
		this.render();
		this.loadAudio();
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
                        <h3>${this.session.title || "Untitled Session"}</h3>
                        <div class="detail-date">${dateStr} • ${durationMin} min</div>
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
		this.loadSummary();
	}

	private async loadSummary() {
		const summaryEl = this.container.querySelector("#session-summary-text");

		// Future implementation: Fetch summary from storage
		if (summaryEl)
			summaryEl.textContent = "Summary display not fully connected yet.";
	}

	private renderTranscript() {
		const container = this.container.querySelector("#transcript-container");
		if (!container) return;

		container.innerHTML = "";
		this.transcriptElements = [];

		// Sort transcript by start time
		const sorted = [...this.session.transcript].sort(
			(a, b) => a.start - b.start,
		);

		sorted.forEach((segment, index) => {
			const el = document.createElement("div");
			el.className = "transcript-segment";
			el.dataset.index = index.toString();
			el.dataset.start = segment.start.toString();
			el.dataset.end = segment.end.toString();

			const startTime = this.formatTime(segment.start / 1000);

			el.innerHTML = `
                <div class="segment-time">${startTime}</div>
                <div>${segment.text}</div>
            `;

			el.addEventListener("click", () => {
				if (this.audio) {
					this.audio.currentTime = segment.start / 1000;
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
	}

	private async loadAudio() {
		try {
			const files = await this.audioManager.getAudioFilesBySession(
				this.session.id,
			);
			if (files.length > 0) {
				const blob = files[0] as unknown as Blob;
				const url = URL.createObjectURL(blob);
				this.audio = new Audio(url);

				this.audio.addEventListener("loadedmetadata", () => {
					const totalTimeEl = this.container.querySelector("#total-time");
					if (totalTimeEl && this.audio) {
						totalTimeEl.textContent = this.formatTime(this.audio.duration);
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
		} else {
			this.audio.play();
			this.startProgressLoop();
		}
		this.isPlaying = !this.isPlaying;
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
			const duration = this.audio.duration || 1;
			const percent = (current / duration) * 100;

			// Update progress bar
			const fill = this.container.querySelector(
				"#progress-fill",
			) as HTMLElement;
			if (fill) fill.style.width = `${percent}%`;

			// Update time display
			const timeDisplay = this.container.querySelector("#current-time");
			if (timeDisplay) timeDisplay.textContent = this.formatTime(current);

			// Highlight transcript
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
		// Implementation pending
		// Keeping parameter for interface consistency
		if (el) return;
	}

	private seek(e: MouseEvent) {
		if (!this.audio) return;

		const progressBar = e.currentTarget as HTMLElement;
		const rect = progressBar.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const width = rect.width;
		const percent = Math.max(0, Math.min(1, x / width));

		this.audio.currentTime = percent * this.audio.duration;

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
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
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
