// Main entry point for MONOLOG LIVE
import "./ui/comment-display.css";
import "./ui/transcription-display.css";

import { CommentSystem } from "./comment-generation/comment-system.js";
import type { SummaryGenerator } from "./interfaces/summary-generation.js";
import { IndexedDBWrapper } from "./storage/indexeddb-wrapper.js";
import {
	BasicInsightGenerator,
	BasicTopicExtractor,
	SummaryGeneratorImpl,
} from "./summary/summary-generator.js";
import { PreferenceManagementUI } from "./ui/preference-management.js";
import { TopicField } from "./ui/topic-field.js";
import { TranscriptionDisplay } from "./ui/transcription-display.js";
import { WebSpeechVoiceInputManager } from "./voice/voice-input-manager.js";

export class MonologLiveApp {
	private storage: IndexedDBWrapper;
	private voiceManager: WebSpeechVoiceInputManager;
	private transcriptionDisplay!: TranscriptionDisplay;
	private commentSystem!: CommentSystem;
	private topicField!: TopicField;
	private preferenceUI!: PreferenceManagementUI;
	private summaryGenerator: SummaryGenerator;
	private isRunning = false;
	private currentSessionId: string | null = null;

	constructor() {
		this.storage = new IndexedDBWrapper();
		this.voiceManager = new WebSpeechVoiceInputManager();
		this.summaryGenerator = new SummaryGeneratorImpl(
			new BasicTopicExtractor(),
			new BasicInsightGenerator(),
		);
	}

	public getSummaryGenerator(): SummaryGenerator {
		return this.summaryGenerator;
	}

	async initialize(): Promise<void> {
		try {
			// Initialize storage
			await this.storage.initialize();

			// Initialize UI components
			this.initializeUI();

			// Set up event handlers
			this.setupEventHandlers();

			this.updateStatus("System ready", "ready");
			console.log("MONOLOG LIVE initialized successfully");
		} catch (error) {
			this.updateStatus(`Initialization failed: ${error}`, "error");
			console.error("Failed to initialize MONOLOG LIVE:", error);
		}
	}

	private initializeUI(): void {
		// Initialize Transcription Display
		const transcriptionMount = document.getElementById("transcription-mount");
		if (transcriptionMount) {
			this.transcriptionDisplay = new TranscriptionDisplay(transcriptionMount, {
				showTimestamps: true,
				autoScroll: true,
			});
		}

		// Initialize Comment System
		const commentMount = document.getElementById("comment-mount");
		if (commentMount) {
			this.commentSystem = new CommentSystem();
			this.commentSystem.initializeDisplay(commentMount);
		}

		// Initialize Topic Field
		const topicMount = document.getElementById("topic-mount");
		if (topicMount) {
			this.topicField = new TopicField(topicMount, {
				onTopicChange: (topic) => console.log("Topic changed:", topic),
				onTopicSubmit: (topic) => console.log("Topic submitted:", topic),
				onTopicClear: () => console.log("Topic cleared"),
			});
		}

		// Initialize Preference UI
		const preferencesMount = document.getElementById("preferences-mount");
		const learningSystem = this.commentSystem.getLearningSystem();
		if (preferencesMount && learningSystem) {
			this.preferenceUI = new PreferenceManagementUI(
				preferencesMount,
				learningSystem,
			);
		}
	}

	private setupEventHandlers(): void {
		const startBtn = document.getElementById("start-btn");
		const stopBtn = document.getElementById("stop-btn");
		const preferencesBtn = document.getElementById("preferences-btn");
		const closePreferencesBtn = document.getElementById("close-preferences");
		const modalOverlay = document.getElementById("preferences-modal");

		startBtn?.addEventListener("click", () => this.startSession());
		stopBtn?.addEventListener("click", () => this.stopSession());

		// Preference Modal Handlers
		preferencesBtn?.addEventListener("click", () =>
			this.togglePreferences(true),
		);
		closePreferencesBtn?.addEventListener("click", () =>
			this.togglePreferences(false),
		);
		modalOverlay?.addEventListener("click", (e) => {
			if (e.target === modalOverlay) this.togglePreferences(false);
		});

		// Voice transcript handling
		this.voiceManager.onTranscript(async (text, isFinal) => {
			if (this.transcriptionDisplay) {
				this.transcriptionDisplay.addTranscript(text, isFinal);
			}

			if (isFinal && this.commentSystem) {
				const context = {
					recentTranscript: text,
					currentTopic: this.topicField?.getCurrentTopic() || "general",
					userEngagement: "medium" as const,
					userEngagementLevel: 0.5,
					speechVolume: 0.5,
					speechRate: 1.0,
					silenceDuration: 0,
					sessionDuration: 0, // Should be tracked
					commentHistory: [],
				};
				await this.commentSystem.generateComment(context);
			}
		});

		this.voiceManager.onError((error) => {
			console.error("Voice Manager Error:", error);
			this.updateStatus(`Voice error: ${error.message}`, "error");
		});
	}

	private async startSession(): Promise<void> {
		if (this.isRunning) return;

		try {
			this.currentSessionId = `session_${Date.now()}`;
			const userId = "default_user";

			// Initialize learning for the new session
			if (this.commentSystem) {
				await this.commentSystem.initializeLearning(
					this.storage,
					userId,
					this.currentSessionId,
				);

				// Update Preference UI with the current user
				this.preferenceUI?.setUser(userId);
			}

			this.voiceManager.startListening();
			this.isRunning = true;
			this.updateUIState();
			this.updateStatus("Recoding active - Speak naturally", "running");
		} catch (error) {
			console.error("Failed to start session:", error);
			this.updateStatus("Failed to start session", "error");
		}
	}

	private stopSession(): void {
		if (!this.isRunning) return;

		this.voiceManager.stopListening();
		this.isRunning = false;
		this.currentSessionId = null;
		this.updateUIState();
		this.updateStatus("Session ended", "ready");
	}

	private updateUIState(): void {
		const startBtn = document.getElementById("start-btn") as HTMLButtonElement;
		const stopBtn = document.getElementById("stop-btn") as HTMLButtonElement;

		if (startBtn) startBtn.disabled = this.isRunning;
		if (stopBtn) stopBtn.disabled = !this.isRunning;
	}

	private updateStatus(
		message: string,
		type: "ready" | "error" | "running",
	): void {
		const statusText = document.getElementById("status-text");
		const statusIndicator = document.getElementById("status-indicator");

		if (statusText) statusText.textContent = message;
		if (statusIndicator) {
			statusIndicator.className = type;
		}
	}

	private togglePreferences(show: boolean): void {
		const modal = document.getElementById("preferences-modal");
		if (modal) {
			if (show) {
				modal.classList.add("active");
			} else {
				modal.classList.remove("active");
			}
		}
	}
}

// Initialize the application
const app = new MonologLiveApp();
app.initialize();

// Make globally available
declare global {
	interface Window {
		monologLive: MonologLiveApp;
	}
}
window.monologLive = app;
