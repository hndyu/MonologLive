// Web Speech API integration for continuous voice input

import type {
	SpeechRecognitionError,
	VoiceInputConfig,
	VoiceInputManager,
} from "../interfaces/voice-input.js";

interface WindowWithSpeechRecognition extends Window {
	SpeechRecognition?: typeof SpeechRecognition;
	webkitSpeechRecognition?: typeof SpeechRecognition;
}

export class WebSpeechVoiceInputManager implements VoiceInputManager {
	private recognition: SpeechRecognition | null = null;
	private isCurrentlyListening = false;
	private transcriptCallback:
		| ((text: string, isFinal: boolean) => void)
		| null = null;
	private errorCallback: ((error: SpeechRecognitionError) => void) | null =
		null;
	private config: VoiceInputConfig;
	private restartTimeout: number | null = null;
	private restartAttempts = 0;
	private maxRestartAttempts = 5;

	constructor(config: Partial<VoiceInputConfig> = {}) {
		this.config = {
			continuous: true,
			interimResults: true,
			language: "ja-JP",
			maxAlternatives: 1,
			...config,
		};
	}

	isSupported(): boolean {
		return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
	}

	isListening(): boolean {
		return this.isCurrentlyListening;
	}

	startListening(): void {
		if (!this.isSupported()) {
			this.handleError(
				"not-supported",
				"Web Speech API is not supported in this browser",
			);
			return;
		}

		if (this.isCurrentlyListening) {
			return;
		}

		try {
			this.initializeRecognition();
			this.recognition?.start();
			this.isCurrentlyListening = true;
			this.restartAttempts = 0;
		} catch (error) {
			this.handleError(
				"audio-capture",
				`Failed to start voice recognition: ${error}`,
			);
		}
	}

	stopListening(): void {
		if (this.restartTimeout) {
			clearTimeout(this.restartTimeout);
			this.restartTimeout = null;
		}

		if (this.recognition) {
			this.recognition.stop();
			this.recognition = null;
		}

		this.isCurrentlyListening = false;
		this.restartAttempts = 0;
	}

	onTranscript(callback: (text: string, isFinal: boolean) => void): void {
		this.transcriptCallback = callback;
	}

	onError(callback: (error: SpeechRecognitionError) => void): void {
		this.errorCallback = callback;
	}

	private initializeRecognition(): void {
		const SpeechRecognition =
			(window as WindowWithSpeechRecognition).SpeechRecognition ||
			(window as WindowWithSpeechRecognition).webkitSpeechRecognition;

		if (!SpeechRecognition) {
			throw new Error("Speech recognition not available");
		}

		this.recognition = new SpeechRecognition();

		if (this.recognition) {
			this.recognition.continuous = this.config.continuous;
			this.recognition.interimResults = this.config.interimResults;
			this.recognition.lang = this.config.language;
			this.recognition.maxAlternatives = this.config.maxAlternatives;

			this.recognition.onresult = (event: SpeechRecognitionEvent) => {
				this.handleResult(event);
			};

			this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
				this.handleRecognitionError(event);
			};

			this.recognition.onend = () => {
				this.handleRecognitionEnd();
			};

			this.recognition.onstart = () => {
				this.restartAttempts = 0;
			};
		}
	}

	private handleResult(event: SpeechRecognitionEvent): void {
		if (!this.transcriptCallback) return;

		for (let i = event.resultIndex; i < event.results.length; i++) {
			const result = event.results[i];
			const transcript = result[0].transcript;
			const isFinal = result.isFinal;

			this.transcriptCallback(transcript, isFinal);
		}
	}

	private handleRecognitionError(event: SpeechRecognitionErrorEvent): void {
		const errorType = event.error;
		let shouldRestart = false;

		switch (errorType) {
			case "no-speech":
				// No speech detected - this is normal, continue listening
				shouldRestart = true;
				break;
			case "audio-capture":
				this.handleError(
					"audio-capture",
					"Microphone access denied or unavailable",
				);
				break;
			case "not-allowed":
				this.handleError("not-allowed", "Microphone permission denied");
				break;
			case "network":
				// Network error - attempt restart
				shouldRestart = true;
				this.handleError("network", "Network error during speech recognition");
				break;
			case "aborted":
				// Recognition was aborted - attempt restart if we should still be listening
				if (this.isCurrentlyListening) {
					shouldRestart = true;
				}
				break;
			default:
				this.handleError(errorType, `Speech recognition error: ${errorType}`);
				shouldRestart = true;
		}

		if (shouldRestart && this.isCurrentlyListening) {
			this.attemptRestart();
		}
	}

	private handleRecognitionEnd(): void {
		// If we should still be listening, restart recognition
		if (this.isCurrentlyListening) {
			this.attemptRestart();
		}
	}

	private attemptRestart(): void {
		if (this.restartAttempts >= this.maxRestartAttempts) {
			this.handleError("max-restarts", "Maximum restart attempts reached");
			this.stopListening();
			return;
		}

		this.restartAttempts++;

		// Clear any existing restart timeout
		if (this.restartTimeout) {
			clearTimeout(this.restartTimeout);
		}

		// Restart after a short delay
		this.restartTimeout = window.setTimeout(() => {
			if (this.isCurrentlyListening) {
				try {
					this.initializeRecognition();
					this.recognition?.start();
				} catch (error) {
					this.handleError(
						"restart-failed",
						`Failed to restart recognition: ${error}`,
					);
				}
			}
		}, 1000);
	}

	private handleError(error: string, message: string): void {
		const errorObj: SpeechRecognitionError = {
			error,
			message,
			timestamp: new Date(),
		};

		if (this.errorCallback) {
			this.errorCallback(errorObj);
		}

		console.error("Voice input error:", errorObj);
	}
}
