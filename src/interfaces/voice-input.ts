// Voice input interfaces for Web Speech API integration

export interface VoiceInputManager {
  startListening(): void;
  stopListening(): void;
  onTranscript(callback: (text: string, isFinal: boolean) => void): void;
  onError(callback: (error: SpeechRecognitionError) => void): void;
  isListening(): boolean;
  isSupported(): boolean;
}

export interface SpeechRecognitionError {
  error: string;
  message: string;
  timestamp: Date;
}

export interface VoiceInputConfig {
  continuous: boolean;
  interimResults: boolean;
  language: string;
  maxAlternatives: number;
}