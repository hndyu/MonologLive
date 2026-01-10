// Audio recording interfaces for local storage

import { AudioFile, AudioQualitySettings, RecordingStatus, StorageInfo } from '../types/core.js';

export interface AudioRecorder {
  startRecording(): void;
  stopRecording(): Promise<AudioFile>;
  getRecordingStatus(): RecordingStatus;
  configureQuality(settings: AudioQualitySettings): void;
  isSupported(): boolean;
}

export interface AudioManager {
  saveAudioFile(audio: AudioFile, sessionId: string): Promise<string>;
  getAudioFiles(userId: string): Promise<AudioFile[]>;
  deleteAudioFile(fileId: string): Promise<boolean>;
  getStorageUsage(): Promise<StorageInfo>;
  cleanupOldFiles(maxAge: number): Promise<number>;
}