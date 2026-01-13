// Main entry point for MONOLOG LIVE
import "./ui/comment-display.css";
import "./ui/transcription-display.css";

import { LocalAudioManager } from "./audio/audio-manager";
import { WebAudioRecorder } from "./audio/audio-recorder";
import { CommentSystem } from "./comment-generation/comment-system.js";
import type { SummaryGenerator } from "./interfaces/summary-generation.js";
import { SessionManagerImpl } from "./session/session-manager.js";
import { TopicManager } from "./session/topic-manager.js";
import { IndexedDBWrapper } from "./storage/indexeddb-wrapper.js";
import {
	BasicInsightGenerator,
	BasicTopicExtractor,
	SummaryGeneratorImpl,
} from "./summary/summary-generator.js";
import { WhisperTranscription } from "./transcription/enhanced-transcription";
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
	private sessionManager: SessionManagerImpl;
	private topicManager: TopicManager;
	private audioManager: LocalAudioManager;
	private audioRecorder: WebAudioRecorder;
	private whisper: WhisperTranscription;
	private isRunning = false;
	private currentSessionId: string | null = null;

	constructor() {
		this.storage = new IndexedDBWrapper();
		this.voiceManager = new WebSpeechVoiceInputManager();
		this.audioRecorder = new WebAudioRecorder();
		this.audioManager = new LocalAudioManager(this.storage);
		this.whisper = new WhisperTranscription();
		this.summaryGenerator = new SummaryGeneratorImpl(
			new BasicTopicExtractor(),
			new BasicInsightGenerator(),
		);
		this.sessionManager = new SessionManagerImpl(
			this.storage,
			this.summaryGenerator,
		);
		this.topicManager = new TopicManager("init");
	}

	public getSummaryGenerator(): SummaryGenerator {
		return this.summaryGenerator;
	}

	public getSessionManager(): SessionManagerImpl {
		return this.sessionManager;
	}

	public getTopicManager(): TopicManager {
		return this.topicManager;
	}

	public getAudioManager(): LocalAudioManager {
		return this.audioManager;
	}

	public getAudioRecorder(): WebAudioRecorder {
		return this.audioRecorder;
	}

	public getWhisper(): WhisperTranscription {
		return this.whisper;
	}

	async initialize(): Promise<void> {
		try {
			// Initialize storage
			await this.storage.initialize();

			// Initialize UI components
			this.initializeUI();

			// Set up event handlers
			this.setupEventHandlers();

			// Ensure topic manager is ready
			this.topicManager.reset();

			// Check audio recording support
			if (!this.audioRecorder.isSupported()) {
				console.warn("Audio recording is not supported in this browser.");
			} else {
				console.log("Audio recording supported.");
			}

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
		const enhancedBtn = document.getElementById("enhanced-transcribe-btn");
		const preferencesBtn = document.getElementById("preferences-btn");
		const closePreferencesBtn = document.getElementById("close-preferences");
		const modalOverlay = document.getElementById("preferences-modal");

		startBtn?.addEventListener("click", () => this.startSession());
		stopBtn?.addEventListener("click", () => this.stopSession());
		enhancedBtn?.addEventListener("click", () =>
			this.runEnhancedTranscription(),
		);

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

			// Hide enhanced transcription button at session start
			this.toggleEnhancedTranscriptionButton(false);

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

			// Start audio recording
			await this.audioRecorder.startRecording();

			this.voiceManager.startListening();
			this.isRunning = true;
			this.updateUIState();
			this.updateStatus("Recording active - Speak naturally", "running");
		} catch (error) {
			console.error("Failed to start session:", error);
			this.updateStatus("Failed to start session", "error");
		}
	}

	private async stopSession(): Promise<void> {
		if (!this.isRunning) return;

		try {
			this.voiceManager.stopListening();

			// Stop audio recording and get the file
			const audioFile = await this.audioRecorder.stopRecording();

			// Save the audio file to storage if we have a session ID
			if (this.currentSessionId && audioFile) {
				await this.audioManager.saveAudioFile(audioFile, this.currentSessionId);
				console.log(`Audio saved for session: ${this.currentSessionId}`);

				// Show enhanced transcription button
				this.toggleEnhancedTranscriptionButton(true);
			}

			this.isRunning = false;
			this.currentSessionId = null;
			this.updateUIState();
			this.updateStatus("Session ended", "ready");
		} catch (error) {
			console.error("Failed to stop session cleanly:", error);
			this.updateStatus("Error stopping session", "error");
			this.isRunning = false;
			this.currentSessionId = null;
			this.updateUIState();
		}
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

	private toggleEnhancedTranscriptionButton(show: boolean): void {
		const btn = document.getElementById("enhanced-transcribe-btn");
		if (btn) {
			btn.style.display = show ? "flex" : "none";
		}
	}

	private async runEnhancedTranscription(): Promise<void> {
		if (!this.currentSessionId || !this.whisper.isAvailable()) {
			return;
		}

		const btn = document.getElementById(
			"enhanced-transcribe-btn",
		) as HTMLButtonElement;
		const statusText = document.getElementById("status-text");

		try {
			// Update UI to loading state
			if (btn) btn.disabled = true;
			if (statusText)
				statusText.textContent = "Enhanced transcription in progress...";

			// Get the audio file for current session
			const audioFiles = await this.audioManager.getAudioFilesBySession(
				this.currentSessionId,
			);

			if (!audioFiles || audioFiles.length === 0) {
				console.error(
					"No audio file found for session:",
					this.currentSessionId,
				);
				if (statusText)
					statusText.textContent = "No audio recorded for this session.";
				return;
			}

			const audioFile = audioFiles[0];

			// Run transcription
			const result = await this.whisper.transcribeAudio(audioFile);

			if (result?.text) {
				// Add to display with special marker
				this.transcriptionDisplay.addTranscript(
					`✨ [Enhanced] ${result.text}`,
					true,
				);
				if (statusText) statusText.textContent = "Transcription complete!";
			} else {
				if (statusText)
					statusText.textContent = "Transcription failed or returned no text.";
			}
		} catch (error) {
			console.error("Enhanced transcription error:", error);
			if (statusText)
				statusText.textContent = "Error during enhanced transcription.";
		} finally {
			if (btn) btn.disabled = false;
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
