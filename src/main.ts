// Main entry point for MONOLOG LIVE
import "./ui/comment-display.css";
import "./ui/transcription-display.css";
import "./ui/session-summary.css";

import { LocalAudioManager } from "./audio/audio-manager";
import { WebAudioRecorder } from "./audio/audio-recorder";
import { CommentSystem } from "./comment-generation/comment-system.js";
import {
	createError,
	ErrorSeverity,
	ErrorType,
	errorHandler,
	errorUI,
} from "./error-handling/index.js";
import type { EnhancedTranscription } from "./interfaces/enhanced-transcription";
import type { SummaryGenerator } from "./interfaces/summary-generation.js";
import { lazyLoader } from "./performance/index.js";
import { SessionManagerImpl } from "./session/session-manager.js";
import { TopicManager } from "./session/topic-manager.js";
import { IndexedDBWrapper } from "./storage/indexeddb-wrapper.js";
import { GeminiClientImpl } from "./summary/gemini-client.js";
import {
	BasicInsightGenerator,
	BasicTopicExtractor,
	SummaryGeneratorImpl,
} from "./summary/summary-generator.js";
import { HistoryModal } from "./ui/history-modal.js";
import { PreferenceManagementUI } from "./ui/preference-management.js";
import { SessionSummaryUI } from "./ui/session-summary.js";
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
	private historyUI!: HistoryModal;
	private summaryUI!: SessionSummaryUI;
	private summaryGenerator: SummaryGenerator;
	private sessionManager: SessionManagerImpl;
	private topicManager: TopicManager;
	private audioManager: LocalAudioManager;
	private audioRecorder: WebAudioRecorder;
	private whisper: EnhancedTranscription | null = null;
	private isRunning = false;
	private currentSessionId: string | null = null;
	private lastSessionId: string | null = null;

	constructor() {
		this.storage = new IndexedDBWrapper();
		this.voiceManager = new WebSpeechVoiceInputManager();
		this.audioRecorder = new WebAudioRecorder();
		this.audioManager = new LocalAudioManager(this.storage);
		this.summaryGenerator = new SummaryGeneratorImpl(
			new BasicTopicExtractor(),
			new BasicInsightGenerator(),
			new GeminiClientImpl(),
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

	public async getWhisper(): Promise<EnhancedTranscription | null> {
		if (!this.whisper) {
			const { WhisperTranscription } = await import(
				"./transcription/enhanced-transcription"
			);
			this.whisper = new WhisperTranscription();
		}
		return this.whisper;
	}

	async initialize(): Promise<void> {
		try {
			const startTime = performance.now();

			// Set up global error handlers
			this.setupGlobalErrorHandlers();

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
				await errorHandler.handleError(
					createError(
						ErrorType.BROWSER_COMPATIBILITY,
						ErrorSeverity.MEDIUM,
						"Audio recording is not supported in this browser.",
					),
				);
			} else {
				console.log("Audio recording supported.");
			}

			// Preload essential features
			await lazyLoader.loadFeaturesConditionally();

			// Record initialization time
			const initDuration = performance.now() - startTime;
			console.log(
				`MONOLOG LIVE initialized successfully in ${initDuration.toFixed(2)}ms`,
			);
			this.updateStatus("System ready", "ready");
		} catch (error) {
			const monologError = createError(
				ErrorType.STORAGE,
				ErrorSeverity.CRITICAL,
				`Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : new Error(String(error)),
			);
			await errorHandler.handleError(monologError);
			this.updateStatus("Initialization failed", "error");
		}
	}

	private setupGlobalErrorHandlers(): void {
		// Connect ErrorHandler to ErrorUI for user-facing notifications
		// We register a callback for each error type to show the UI
		for (const type of Object.values(ErrorType)) {
			errorHandler.onError(type as ErrorType, (error) => {
				errorUI.showError(error, errorHandler.getRecoveryStrategy(error));
			});
		}

		window.addEventListener("error", (event) => {
			const error = createError(
				ErrorType.SESSION, // Default to session for unknown UI errors
				ErrorSeverity.HIGH,
				`Global error: ${event.message}`,
				event.error,
			);
			errorHandler.handleError(error);
		});

		window.addEventListener("unhandledrejection", (event) => {
			const error = createError(
				ErrorType.SESSION,
				ErrorSeverity.HIGH,
				`Unhandled promise rejection: ${event.reason}`,
				event.reason instanceof Error
					? event.reason
					: new Error(String(event.reason)),
			);
			errorHandler.handleError(error);
		});
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
			this.commentSystem.initialize(this.storage);
		}

		// Initialize Topic Field
		const topicMount = document.getElementById("topic-mount");
		if (topicMount) {
			this.topicField = new TopicField(topicMount, {
				onTopicChange: (topic) => {
					this.topicManager.setTopic(topic, "user_input");
				},
				onTopicSubmit: (topic) => {
					this.topicManager.setTopic(topic, "user_input");

					// If session is running, add interaction
					if (this.isRunning && this.currentSessionId) {
						this.sessionManager.addUserInteraction(this.currentSessionId, {
							commentId: "topic_change",
							type: "pickup",
							timestamp: new Date(),
							confidence: 1.0,
						});
					}
				},
				onTopicClear: () => {
					console.log("Topic cleared");
					this.topicManager.setTopic(null, "user_input");
				},
			});
		}
	}

	private async initializeSummaryUI(): Promise<void> {
		if (this.summaryUI) return;

		try {
			// Ensure summary-generator feature is loaded
			if (!lazyLoader.isFeatureLoaded("summary-generator")) {
				await lazyLoader.loadFeature("summary-generator");
			}

			const summaryMount = document.getElementById("summary-mount");
			if (summaryMount) {
				this.summaryUI = new SessionSummaryUI(summaryMount);
				console.log("Summary UI initialized on demand");
			}
		} catch (error) {
			const monologError = createError(
				ErrorType.BROWSER_COMPATIBILITY,
				ErrorSeverity.MEDIUM,
				`Failed to initialize Summary UI: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : new Error(String(error)),
			);
			await errorHandler.handleError(monologError);
		}
	}

	private setupEventHandlers(): void {
		const startBtn = document.getElementById("start-btn");
		const stopBtn = document.getElementById("stop-btn");
		const enhancedBtn = document.getElementById("enhanced-transcribe-btn");
		const preferencesBtn = document.getElementById("preferences-btn");
		const closePreferencesBtn = document.getElementById("close-preferences");
		const modalOverlay = document.getElementById("preferences-modal");

		const historyBtn = document.getElementById("history-btn");
		const closeHistoryBtn = document.getElementById("close-history");
		const historyOverlay = document.getElementById("history-modal");

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

		// History Modal Handlers
		historyBtn?.addEventListener("click", () => this.toggleHistory(true));
		closeHistoryBtn?.addEventListener("click", () => this.toggleHistory(false));
		historyOverlay?.addEventListener("click", (e) => {
			if (e.target === historyOverlay) this.toggleHistory(false);
		});

		// Voice transcript handling
		this.voiceManager.onTranscript(async (text, isFinal) => {
			if (this.transcriptionDisplay) {
				this.transcriptionDisplay.addTranscript(text, isFinal);
			}

			if (isFinal) {
				// Save transcript segment to session manager using trackActivity for proper timing
				if (this.currentSessionId) {
					this.sessionManager.trackActivity(this.currentSessionId, {
						type: "speech",
						timestamp: new Date(),
						data: {
							transcript: text,
							confidence: 1.0,
							isFinal: true,
						},
						duration: 0,
					});
				}

				if (this.commentSystem) {
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
					const comment = await this.commentSystem.generateComment(context);

					// Save comment to session manager if generated
					if (this.currentSessionId && comment) {
						this.sessionManager.addComment(this.currentSessionId, comment);
					}
				}
			}
		});

		this.voiceManager.onError((error) => {
			const monologError = createError(
				ErrorType.VOICE_INPUT,
				ErrorSeverity.MEDIUM,
				`Voice Manager Error: ${error.message}`,
				new Error(error.message),
			);
			errorHandler.handleError(monologError);
			this.updateStatus(`Voice error: ${error.message}`, "error");
		});
	}

	private async startSession(): Promise<void> {
		if (this.isRunning) return;

		try {
			const userId = "default_user";
			const topic = this.topicField?.getCurrentTopic() || "general";

			// Use SessionManager to start the session
			const session = this.sessionManager.startSession(userId, topic);
			this.currentSessionId = session.id;

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
			const monologError = createError(
				ErrorType.VOICE_INPUT,
				ErrorSeverity.HIGH,
				`Failed to start session: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : new Error(String(error)),
			);
			await errorHandler.handleError(monologError);
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

			// End the session in SessionManager
			if (this.currentSessionId) {
				// Get Gemini API key from localStorage (Prioritize UI preference)
				const storedKey = localStorage.getItem("GEMINI_API_KEY");
				const apiKey = this.isValidKey(storedKey) ? storedKey : undefined;

				// Lazy load summary components
				await this.initializeSummaryUI();

				// Show loading UI while generating summary
				if (this.summaryUI) {
					this.summaryUI.showLoading(
						apiKey ? "Generating summary with AI..." : "Generating summary...",
					);
				}

				const summary = await this.sessionManager.endSession(
					this.currentSessionId,
					apiKey as string | undefined, // cast to match signature but we know it's valid if provided
				);

				// Show summary UI
				if (this.summaryUI) {
					this.summaryUI.show(summary);
				}
			}

			this.isRunning = false;
			this.lastSessionId = this.currentSessionId;
			this.currentSessionId = null;
			this.updateUIState();
			this.updateStatus("Session ended", "ready");
		} catch (error) {
			const monologError = createError(
				ErrorType.SESSION,
				ErrorSeverity.HIGH,
				`Error stopping session: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : new Error(String(error)),
			);
			await errorHandler.handleError(monologError);
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
				this.initializePreferenceUI().then(() => {
					modal.classList.add("active");
				});
			} else {
				modal.classList.remove("active");
			}
		}
	}

	private async initializePreferenceUI(): Promise<void> {
		if (this.preferenceUI) return;

		try {
			// Ensure learning-module is loaded via LazyLoader
			if (!lazyLoader.isFeatureLoaded("learning-module")) {
				await lazyLoader.loadFeature("learning-module");
			}

			const preferencesMount = document.getElementById("preferences-mount");
			const learningSystem = this.commentSystem?.getLearningSystem();

			if (preferencesMount && learningSystem) {
				this.preferenceUI = new PreferenceManagementUI(
					preferencesMount,
					learningSystem,
				);
				console.log("Preference UI initialized on demand");

				// Set user if known (default to current user or default_user)
				this.preferenceUI.setUser("default_user");
			}
		} catch (error) {
			const monologError = createError(
				ErrorType.BROWSER_COMPATIBILITY,
				ErrorSeverity.MEDIUM,
				`Failed to initialize Preference UI: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : new Error(String(error)),
			);
			await errorHandler.handleError(monologError);
		}
	}

	private toggleHistory(show: boolean): void {
		const modal = document.getElementById("history-modal");
		if (modal) {
			if (show) {
				this.initializeHistoryUI().then(() => {
					this.historyUI.refresh();
					modal.classList.add("active");
				});
			} else {
				modal.classList.remove("active");
			}
		}
	}

	private async initializeHistoryUI(): Promise<void> {
		if (this.historyUI) return;

		const mount = document.getElementById("history-mount");
		if (mount) {
			this.historyUI = new HistoryModal(mount, this.storage);
			this.historyUI.setUserId("default_user");
			console.log("History UI initialized on demand");
		}
	}

	private toggleEnhancedTranscriptionButton(show: boolean): void {
		const btn = document.getElementById("enhanced-transcribe-btn");
		if (btn) {
			btn.style.display = show ? "flex" : "none";
		}
	}

	private isValidKey(key: string | null | undefined): boolean {
		if (!key) return false;
		const trimmed = key.trim();
		return trimmed !== "" && trimmed !== "null" && trimmed !== "undefined";
	}

	private async runEnhancedTranscription(): Promise<void> {
		const sessionId = this.currentSessionId || this.lastSessionId;
		const whisper = await this.getWhisper();

		if (!sessionId || !whisper || !whisper.isAvailable()) {
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
			const audioFiles =
				await this.audioManager.getAudioFilesBySession(sessionId);

			if (!audioFiles || audioFiles.length === 0) {
				console.error("No audio file found for session:", sessionId);
				if (statusText)
					statusText.textContent = "No audio recorded for this session.";
				return;
			}

			const audioFile = audioFiles[0];

			// Get raw transcript from session to compare
			const session = await this.sessionManager.getSessionById(sessionId);
			const rawTranscript =
				session?.transcript
					.filter((s) => s.isFinal)
					.map((s) => s.text)
					.join(" ") || "";

			// Run transcription via summary generator for quality comparison
			const enhancedText = await this.summaryGenerator.enhanceTranscript(
				rawTranscript,
				audioFile,
			);

			if (enhancedText) {
				// Add to display with special marker
				this.transcriptionDisplay.addTranscript(
					`✨ [Enhanced] ${enhancedText}`,
					true,
				);
				if (statusText) statusText.textContent = "Transcription complete!";
			} else {
				if (statusText)
					statusText.textContent = "Transcription failed or returned no text.";
			}
		} catch (error) {
			const monologError = createError(
				ErrorType.TRANSCRIPTION,
				ErrorSeverity.HIGH,
				`Enhanced transcription error: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : new Error(String(error)),
			);
			errorHandler.handleError(monologError);
			if (statusText)
				statusText.textContent = "Error during enhanced transcription.";
		} finally {
			if (btn) btn.disabled = false;
		}
	}
}

// Make globally available
declare global {
	interface Window {
		monologLive: MonologLiveApp;
	}
}

// Initialize the application only if not in a test environment
const isTestEnv =
	typeof process !== "undefined" && process.env && process.env.JEST_WORKER_ID;
if (typeof window !== "undefined" && !isTestEnv) {
	const app = new MonologLiveApp();
	app.initialize();

	window.monologLive = app;
}
