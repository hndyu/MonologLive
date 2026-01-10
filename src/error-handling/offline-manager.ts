// Offline mode capabilities for MONOLOG LIVE

export interface OfflineCapabilities {
  voiceInput: boolean;
  audioRecording: boolean;
  basicComments: boolean;
  localStorage: boolean;
  sessionManagement: boolean;
}

export class OfflineManager {
  private static instance: OfflineManager;
  private isOffline = false;
  private capabilities: OfflineCapabilities;
  private offlineCallbacks: (() => void)[] = [];
  private onlineCallbacks: (() => void)[] = [];

  private constructor() {
    this.capabilities = this.assessOfflineCapabilities();
    this.setupNetworkListeners();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOffline = false;
      this.notifyOnlineCallbacks();
      console.log('Network connection restored');
    });

    window.addEventListener('offline', () => {
      this.isOffline = true;
      this.notifyOfflineCallbacks();
      console.log('Network connection lost - entering offline mode');
    });

    // Initial state
    this.isOffline = !navigator.onLine;
  }

  private assessOfflineCapabilities(): OfflineCapabilities {
    return {
      voiceInput: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      audioRecording: 'MediaRecorder' in window,
      basicComments: true, // Rule-based comments work offline
      localStorage: 'indexedDB' in window,
      sessionManagement: true // Basic session management works offline
    };
  }

  // Register callbacks for network state changes
  onOffline(callback: () => void): void {
    this.offlineCallbacks.push(callback);
  }

  onOnline(callback: () => void): void {
    this.onlineCallbacks.push(callback);
  }

  private notifyOfflineCallbacks(): void {
    this.offlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in offline callback:', error);
      }
    });
  }

  private notifyOnlineCallbacks(): void {
    this.onlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in online callback:', error);
      }
    });
  }

  // Check if currently offline
  getOfflineStatus(): boolean {
    return this.isOffline;
  }

  // Get available capabilities in current state
  getCapabilities(): OfflineCapabilities {
    return { ...this.capabilities };
  }

  // Check if specific feature is available offline
  isFeatureAvailable(feature: keyof OfflineCapabilities): boolean {
    return this.capabilities[feature];
  }

  // Get user-friendly status message
  getStatusMessage(): string {
    if (!this.isOffline) {
      return 'All features available';
    }

    const availableFeatures: string[] = [];
    const unavailableFeatures: string[] = [];

    if (this.capabilities.voiceInput) {
      availableFeatures.push('voice input');
    } else {
      unavailableFeatures.push('voice input');
    }

    if (this.capabilities.audioRecording) {
      availableFeatures.push('audio recording');
    } else {
      unavailableFeatures.push('audio recording');
    }

    if (this.capabilities.basicComments) {
      availableFeatures.push('basic comments');
    } else {
      unavailableFeatures.push('comments');
    }

    if (this.capabilities.localStorage) {
      availableFeatures.push('local storage');
    } else {
      unavailableFeatures.push('data saving');
    }

    let message = 'Offline mode: ';
    if (availableFeatures.length > 0) {
      message += `Available - ${availableFeatures.join(', ')}`;
    }
    
    if (unavailableFeatures.length > 0) {
      if (availableFeatures.length > 0) {
        message += '. ';
      }
      message += `Limited - ${unavailableFeatures.join(', ')} unavailable`;
    }

    return message;
  }

  // Enable offline mode manually (for testing or forced offline)
  enableOfflineMode(): void {
    this.isOffline = true;
    this.notifyOfflineCallbacks();
  }

  // Disable offline mode manually
  disableOfflineMode(): void {
    this.isOffline = false;
    this.notifyOnlineCallbacks();
  }

  // Get offline-compatible configuration
  getOfflineConfig(): {
    enableLocalLLM: boolean;
    enableCloudFeatures: boolean;
    enableAudioRecording: boolean;
    enableEnhancedTranscription: boolean;
  } {
    return {
      enableLocalLLM: !this.isOffline, // Local LLM might require initial download
      enableCloudFeatures: !this.isOffline,
      enableAudioRecording: this.capabilities.audioRecording,
      enableEnhancedTranscription: !this.isOffline && this.capabilities.audioRecording
    };
  }
}

// Global offline manager instance
export const offlineManager = OfflineManager.getInstance();