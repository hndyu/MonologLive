// Integration utilities for enhanced transcription with audio recording

import type {
	EnhancedTranscription,
	TranscriptionResult,
} from "../interfaces/enhanced-transcription";
import type { AudioFile } from "../types/core";
import {
	detectCapabilities,
	WhisperTranscription,
} from "./enhanced-transcription";

export class TranscriptionIntegration {
	private enhancedTranscription: EnhancedTranscription | null = null;
	private isInitialized = false;

	async initialize(): Promise<boolean> {
		if (this.isInitialized) {
			return this.enhancedTranscription !== null;
		}

		try {
			// Check device capabilities first
			const capabilities = await detectCapabilities();

			if (!capabilities.supportsWebAssembly) {
				console.warn(
					"WebAssembly not supported, enhanced transcription unavailable",
				);
				return false;
			}

			// Create Whisper transcription with recommended settings
			const whisperTranscription = new WhisperTranscription({
				modelSize: capabilities.recommendedModelSize,
				language: "en", // Default to English, could be made configurable
				temperature: 0.0,
				beamSize: 1,
			});

			if (whisperTranscription.isAvailable()) {
				this.enhancedTranscription = whisperTranscription;
				console.log(
					`Enhanced transcription initialized with ${capabilities.recommendedModelSize} model`,
				);

				// Pre-load the model for better user experience
				await this.enhancedTranscription.loadModel();

				this.isInitialized = true;
				return true;
			} else {
				console.log("Enhanced transcription not available in this environment");
				this.isInitialized = true;
				return false;
			}
		} catch (error) {
			console.error("Failed to initialize enhanced transcription:", error);
			this.isInitialized = true;
			return false;
		}
	}

	isAvailable(): boolean {
		return this.enhancedTranscription !== null && this.isInitialized;
	}

	async transcribeAudioFile(
		audioFile: AudioFile,
	): Promise<TranscriptionResult | null> {
		if (!this.isAvailable()) {
			console.warn("Enhanced transcription not available");
			return null;
		}

		try {
			return await this.enhancedTranscription?.transcribeAudio(audioFile);
		} catch (error) {
			console.error("Enhanced transcription failed:", error);
			return null;
		}
	}

	async compareTranscriptionQuality(
		originalTranscript: string,
		audioFile: AudioFile,
	): Promise<{
		useEnhanced: boolean;
		originalQuality: number;
		enhancedQuality: number;
		enhancedResult?: TranscriptionResult;
	}> {
		const originalQuality = this.assessTranscriptQuality(originalTranscript);

		if (!this.isAvailable()) {
			return {
				useEnhanced: false,
				originalQuality,
				enhancedQuality: 0,
			};
		}

		try {
			const enhancedResult = await this.transcribeAudioFile(audioFile);

			if (!enhancedResult) {
				return {
					useEnhanced: false,
					originalQuality,
					enhancedQuality: 0,
				};
			}

			const enhancedQuality = this.assessTranscriptQuality(enhancedResult.text);

			// Use enhanced transcription if it's significantly better (10% improvement threshold)
			const useEnhanced = enhancedQuality > originalQuality * 1.1;

			return {
				useEnhanced,
				originalQuality,
				enhancedQuality,
				enhancedResult,
			};
		} catch (error) {
			console.error("Failed to compare transcription quality:", error);
			return {
				useEnhanced: false,
				originalQuality,
				enhancedQuality: 0,
			};
		}
	}

	getModelInfo() {
		return this.enhancedTranscription?.getModelInfo() || null;
	}

	private assessTranscriptQuality(transcript: string): number {
		if (!transcript || transcript.trim().length === 0) {
			return 0;
		}

		let score = 0;
		const text = transcript.toLowerCase();

		// Check for proper sentence structure
		const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
		if (sentences.length > 0) {
			score += 0.3;

			// Check average sentence length (reasonable sentences are 5-20 words)
			const avgLength =
				sentences.reduce((sum, s) => sum + s.split(" ").length, 0) /
				sentences.length;
			if (avgLength >= 5 && avgLength <= 20) {
				score += 0.2;
			}
		}

		// Check for proper capitalization and punctuation
		if (/^[A-Z]/.test(transcript.trim())) {
			score += 0.1;
		}

		if (/[.!?]$/.test(transcript.trim())) {
			score += 0.1;
		}

		// Check for common filler words (lower quality if too many)
		const fillerWords = ["um", "uh", "like", "you know", "so", "well"];
		const words = text.split(/\s+/);
		const fillerCount = words.filter((word) =>
			fillerWords.includes(word),
		).length;
		const fillerRatio = fillerCount / words.length;

		if (fillerRatio < 0.1) {
			score += 0.2;
		} else if (fillerRatio > 0.3) {
			score -= 0.2;
		}

		// Check for coherent content (presence of common words)
		const commonWords = [
			"the",
			"and",
			"to",
			"of",
			"a",
			"in",
			"is",
			"it",
			"you",
			"that",
		];
		const hasCommonWords = commonWords.some((word) => text.includes(word));
		if (hasCommonWords) {
			score += 0.1;
		}

		return Math.max(0, Math.min(1, score));
	}
}

// Singleton instance for global use
export const transcriptionIntegration = new TranscriptionIntegration();
