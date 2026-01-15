// Enhanced transcription interfaces for optional Whisper integration

import type { AudioFile, TranscriptSegment } from "../types/core.js";

export interface EnhancedTranscription {
	isAvailable(): boolean;
	transcribeAudio(audioFile: AudioFile): Promise<TranscriptionResult>;
	getModelInfo(): WhisperModelInfo;
	configureModel(settings: WhisperSettings): void;
	loadModel(): Promise<boolean>;
}

export interface TranscriptionResult {
	text: string;
	confidence: number;
	segments: TranscriptSegment[];
	language: string;
	processingTime: number;
}

export type WhisperLoadStatus = "idle" | "loading" | "loaded" | "error";

export interface WhisperModelInfo {
	name: string;
	size: string;
	languages: string[];
	isLoaded: boolean; // Keep for backward compatibility
	status: WhisperLoadStatus;
	memoryUsage: number;
	error?: string;
}

export interface WhisperSettings {
	modelSize: "tiny" | "base" | "small" | "medium" | "large";
	temperature: number;
	beamSize: number;
}
