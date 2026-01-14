// Audio recording implementation using MediaRecorder API

import {
	ErrorSeverity,
	ErrorType,
	MonologAppError,
} from "../error-handling/index.js";
import type { AudioRecorder } from "../interfaces/audio-recording.js";
import type {
	AudioFile,
	AudioFormat,
	AudioQualitySettings,
	RecordingStatus,
} from "../types/core.js";

export class WebAudioRecorder implements AudioRecorder {
	private mediaRecorder: MediaRecorder | null = null;
	private audioStream: MediaStream | null = null;
	private recordedChunks: Blob[] = [];
	private status: RecordingStatus = "idle";
	private startTime: number = 0;
	private qualitySettings: AudioQualitySettings = {
		bitrate: 128000, // 128 kbps
		sampleRate: 44100, // 44.1 kHz
		channels: 1, // mono
	};

	constructor() {
		this.checkSupport();
	}

	private checkSupport(): void {
		if (!navigator.mediaDevices) {
			console.warn("MediaDevices API not supported");
		}
		if (!window.MediaRecorder) {
			console.warn("MediaRecorder API not supported");
		}
	}

	isSupported(): boolean {
		return !!(navigator.mediaDevices && window.MediaRecorder);
	}

	async startRecording(): Promise<void> {
		if (!this.isSupported()) {
			throw new MonologAppError(
				ErrorType.BROWSER_COMPATIBILITY,
				ErrorSeverity.CRITICAL,
				"Audio recording not supported in this browser",
			);
		}

		if (this.status === "recording") {
			console.warn("Recording already in progress");
			return;
		}

		try {
			// Request microphone access
			this.audioStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					sampleRate: this.qualitySettings.sampleRate,
					channelCount: this.qualitySettings.channels,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});

			// Determine the best supported format
			const format = this.getBestSupportedFormat();
			const mimeType = this.getMimeType(format);

			// Create MediaRecorder with quality settings
			const options: MediaRecorderOptions = {
				mimeType,
				audioBitsPerSecond: this.qualitySettings.bitrate,
			};

			this.mediaRecorder = new MediaRecorder(this.audioStream, options);
			this.recordedChunks = [];
			this.startTime = Date.now();

			// Set up event handlers
			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.recordedChunks.push(event.data);
				}
			};

			this.mediaRecorder.onerror = (event) => {
				console.error("MediaRecorder error:", event);
				this.status = "error";
			};

			this.mediaRecorder.onstart = () => {
				this.status = "recording";
			};

			this.mediaRecorder.onstop = () => {
				this.status = "idle";
				this.stopAudioStream();
			};

			// Start recording with data available every second
			this.mediaRecorder.start(1000);
		} catch (error) {
			this.status = "error";
			this.stopAudioStream();
			throw new MonologAppError(
				ErrorType.AUDIO_RECORDING,
				ErrorSeverity.HIGH,
				`Failed to start recording: ${error instanceof Error ? error.message : "Unknown error"}`,
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	async stopRecording(): Promise<AudioFile> {
		if (!this.mediaRecorder || this.status !== "recording") {
			throw new MonologAppError(
				ErrorType.AUDIO_RECORDING,
				ErrorSeverity.MEDIUM,
				"No active recording to stop",
			);
		}

		return new Promise((resolve, reject) => {
			if (!this.mediaRecorder) {
				reject(
					new MonologAppError(
						ErrorType.AUDIO_RECORDING,
						ErrorSeverity.HIGH,
						"MediaRecorder not available",
					),
				);
				return;
			}

			this.mediaRecorder.onstop = () => {
				try {
					const duration = (Date.now() - this.startTime) / 1000;
					const format = this.getBestSupportedFormat();
					const audioBlob = new Blob(this.recordedChunks, {
						type: this.getMimeType(format),
					});

					const audioFile: AudioFile = {
						id: this.generateId(),
						sessionId: "", // Will be set by the caller
						filename: `recording_${Date.now()}.${format}`,
						format,
						duration,
						size: audioBlob.size,
						createdAt: new Date(),
						quality: { ...this.qualitySettings },
					};

					// Store the blob data in the audioFile for later use
					audioFile.blob = audioBlob;

					this.status = "idle";
					this.stopAudioStream();
					resolve(audioFile);
				} catch (error) {
					reject(
						new MonologAppError(
							ErrorType.AUDIO_RECORDING,
							ErrorSeverity.HIGH,
							`Error during recording stop: ${error instanceof Error ? error.message : String(error)}`,
							error instanceof Error ? error : new Error(String(error)),
						),
					);
				}
			};

			this.mediaRecorder.stop();
		});
	}

	getRecordingStatus(): RecordingStatus {
		return this.status;
	}

	configureQuality(settings: AudioQualitySettings): void {
		if (this.status === "recording") {
			throw new Error("Cannot change quality settings during recording");
		}
		this.qualitySettings = { ...settings };
	}

	private stopAudioStream(): void {
		if (this.audioStream) {
			this.audioStream.getTracks().forEach((track) => {
				track.stop();
			});
			this.audioStream = null;
		}
	}

	private getBestSupportedFormat(): AudioFormat {
		// Check supported formats in order of preference
		const formats: { format: AudioFormat; mimeType: string }[] = [
			{ format: "webm", mimeType: "audio/webm;codecs=opus" },
			{ format: "webm", mimeType: "audio/webm" },
			{ format: "mp4", mimeType: "audio/mp4" },
			{ format: "wav", mimeType: "audio/wav" },
		];

		for (const { format, mimeType } of formats) {
			if (MediaRecorder.isTypeSupported(mimeType)) {
				return format;
			}
		}

		// Fallback to webm if nothing else is supported
		return "webm";
	}

	private getMimeType(format: AudioFormat): string {
		switch (format) {
			case "webm":
				return MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
					? "audio/webm;codecs=opus"
					: "audio/webm";
			case "mp4":
				return "audio/mp4";
			case "wav":
				return "audio/wav";
			default:
				return "audio/webm";
		}
	}

	private generateId(): string {
		return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	// Cleanup method
	dispose(): void {
		if (this.status === "recording") {
			this.mediaRecorder?.stop();
		}
		this.stopAudioStream();
		this.recordedChunks = [];
	}
}
