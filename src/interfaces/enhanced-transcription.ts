// Enhanced transcription interfaces for optional Whisper integration

import { AudioFile, TranscriptSegment } from '../types/core.js';

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

export interface WhisperModelInfo {
  name: string;
  size: string;
  languages: string[];
  isLoaded: boolean;
  memoryUsage: number;
}

export interface WhisperSettings {
  modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  language?: string;
  temperature: number;
  beamSize: number;
}