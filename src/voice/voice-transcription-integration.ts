// Integration component for voice input and transcription display

import type { VoiceInputConfig } from "../interfaces/voice-input.js";
import { TranscriptionDisplay } from "../ui/transcription-display.js";
import { WebSpeechVoiceInputManager } from "./voice-input-manager.js";

export interface VoiceTranscriptionConfig {
	voiceConfig?: Partial<VoiceInputConfig>;
	displayConfig?: {
		maxLines?: number;
		autoScroll?: boolean;
		showTimestamps?: boolean;
	};
}

export class VoiceTranscriptionIntegration {
	private voiceManager: WebSpeechVoiceInputManager;
	private transcriptionDisplay: TranscriptionDisplay;
	private isActive = false;
	private errorCallback?: (error: Error) => void;

	constructor(
		displayContainer: HTMLElement,
		config: VoiceTranscriptionConfig = {},
	) {
		this.voiceManager = new WebSpeechVoiceInputManager(config.voiceConfig);
		this.transcriptionDisplay = new TranscriptionDisplay(
			displayContainer,
			config.displayConfig,
		);

		this.setupEventHandlers();
	}

	private setupEventHandlers(): void {
		// Handle transcription results
		this.voiceManager.onTranscript((text: string, isFinal: boolean) => {
			this.transcriptionDisplay.addTranscript(text, isFinal);
		});

		// Handle voice input errors
		this.voiceManager.onError((error) => {
			console.error("Voice input error:", error);
			if (this.errorCallback) {
				this.errorCallback(error);
			}
		});
	}

	start(): void {
		if (!this.voiceManager.isSupported()) {
			const error = new Error(
				"Speech recognition is not supported in this browser",
			);
			if (this.errorCallback) {
				this.errorCallback(error);
			}
			return;
		}

		this.voiceManager.startListening();
		this.isActive = true;
	}

	stop(): void {
		this.voiceManager.stopListening();
		this.isActive = false;
	}

	clear(): void {
		this.transcriptionDisplay.clear();
	}

	isListening(): boolean {
		return this.isActive && this.voiceManager.isListening();
	}

	isSupported(): boolean {
		return this.voiceManager.isSupported();
	}

	getTranscriptText(): string {
		return this.transcriptionDisplay.getTranscriptText();
	}

	onError(callback: (error: Error) => void): void {
		this.errorCallback = callback;
	}

	updateConfig(config: VoiceTranscriptionConfig): void {
		if (config.displayConfig) {
			this.transcriptionDisplay.setConfig(config.displayConfig);
		}
		// Note: Voice config changes require recreating the voice manager
		// This is a limitation of the Web Speech API
	}
}
