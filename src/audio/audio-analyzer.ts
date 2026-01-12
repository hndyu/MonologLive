// Real-time audio analysis for volume and speech rate detection

export interface AudioAnalysisData {
	volume: number; // 0-100 scale
	speechRate: number; // words per minute estimate
	isSpeaking: boolean;
	silenceDuration: number; // milliseconds of current silence
	averageVolume: number; // rolling average
	volumeVariance: number; // measure of volume changes
}

export interface AudioAnalysisConfig {
	volumeThreshold: number; // minimum volume to consider as speech
	silenceThreshold: number; // milliseconds before considering silence
	analysisInterval: number; // milliseconds between analysis updates
	smoothingFactor: number; // 0-1, higher = more smoothing
	speechRateWindow: number; // milliseconds to analyze for speech rate
}

export const DEFAULT_AUDIO_ANALYSIS_CONFIG: AudioAnalysisConfig = {
	volumeThreshold: 10, // 10% volume threshold
	silenceThreshold: 1000, // 1 second silence threshold
	analysisInterval: 100, // analyze every 100ms
	smoothingFactor: 0.3, // moderate smoothing
	speechRateWindow: 10000, // 10 second window for speech rate
};

/**
 * Real-time audio analysis for volume detection and speech rate monitoring
 * Implements Requirements 4.1, 4.2, 4.3 for adaptive comment frequency
 */
export class AudioAnalyzer {
	private audioContext: AudioContext | null = null;
	private analyser: AnalyserNode | null = null;
	private microphone: MediaStreamAudioSourceNode | null = null;
	private dataArray: Uint8Array | null = null;
	private config: AudioAnalysisConfig;

	// Analysis state
	private currentVolume = 0;
	private averageVolume = 0;
	private volumeHistory: number[] = [];
	private silenceStartTime = 0;
	private isSpeaking = false;
	private speechEvents: { timestamp: number; volume: number }[] = [];

	// Callbacks
	private onAnalysisUpdate: ((data: AudioAnalysisData) => void) | null = null;
	private onVolumeChange:
		| ((volume: number, averageVolume: number) => void)
		| null = null;
	private onSpeechStateChange:
		| ((isSpeaking: boolean, silenceDuration: number) => void)
		| null = null;

	// Analysis loop
	private analysisInterval: number | null = null;
	private isAnalyzing = false;

	constructor(config: AudioAnalysisConfig = DEFAULT_AUDIO_ANALYSIS_CONFIG) {
		this.config = config;
	}

	/**
	 * Initialize audio analysis with microphone stream
	 */
	async initialize(stream: MediaStream): Promise<void> {
		try {
			// Create audio context
			const AudioContextClass =
				window.AudioContext ||
				(window as Window & { webkitAudioContext?: typeof AudioContext })
					.webkitAudioContext;
			if (!AudioContextClass) {
				throw new Error("AudioContext is not supported in this browser");
			}
			this.audioContext = new AudioContextClass();

			// Create analyser node
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 256;
			this.analyser.smoothingTimeConstant = this.config.smoothingFactor;

			// Connect microphone to analyser
			this.microphone = this.audioContext.createMediaStreamSource(stream);
			this.microphone.connect(this.analyser);

			// Initialize data array for frequency analysis
			const bufferLength = this.analyser.frequencyBinCount;
			this.dataArray = new Uint8Array(bufferLength);

			console.log("Audio analyzer initialized successfully");
		} catch (error) {
			throw new Error(
				`Failed to initialize audio analyzer: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Start real-time audio analysis
	 */
	startAnalysis(): void {
		if (!this.analyser || !this.dataArray) {
			throw new Error("Audio analyzer not initialized");
		}

		if (this.isAnalyzing) {
			return;
		}

		this.isAnalyzing = true;
		this.silenceStartTime = Date.now();

		// Start analysis loop
		this.analysisInterval = window.setInterval(() => {
			this.performAnalysis();
		}, this.config.analysisInterval);

		console.log("Audio analysis started");
	}

	/**
	 * Stop audio analysis
	 */
	stopAnalysis(): void {
		if (this.analysisInterval) {
			clearInterval(this.analysisInterval);
			this.analysisInterval = null;
		}

		this.isAnalyzing = false;
		console.log("Audio analysis stopped");
	}

	/**
	 * Perform real-time audio analysis
	 */
	private performAnalysis(): void {
		if (!this.analyser || !this.dataArray) {
			return;
		}

		// Get frequency data
		const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
		this.analyser.getByteFrequencyData(dataArray);
		this.dataArray = dataArray;

		// Calculate current volume (RMS of frequency data)
		let sum = 0;
		for (let i = 0; i < this.dataArray.length; i++) {
			sum += this.dataArray[i] * this.dataArray[i];
		}
		const rms = Math.sqrt(sum / this.dataArray.length);
		this.currentVolume = Math.min(100, (rms / 255) * 100);

		// Update volume history for averaging
		this.volumeHistory.push(this.currentVolume);
		if (this.volumeHistory.length > 50) {
			// Keep last 5 seconds at 100ms intervals
			this.volumeHistory.shift();
		}

		// Calculate average volume with smoothing
		const instantAverage =
			this.volumeHistory.reduce((sum, vol) => sum + vol, 0) /
			this.volumeHistory.length;
		this.averageVolume =
			this.averageVolume * (1 - this.config.smoothingFactor) +
			instantAverage * this.config.smoothingFactor;

		// Detect speech state
		const now = Date.now();
		const wasSpeaking = this.isSpeaking;
		this.isSpeaking = this.currentVolume > this.config.volumeThreshold;

		// Update speech timing
		if (this.isSpeaking) {
			if (!wasSpeaking) {
				// Speech started
				this.silenceStartTime = 0;
			}

			// Record speech event for rate calculation
			this.speechEvents.push({ timestamp: now, volume: this.currentVolume });

			// Clean old speech events (keep only recent window)
			this.speechEvents = this.speechEvents.filter(
				(event) => now - event.timestamp <= this.config.speechRateWindow,
			);
		} else if (wasSpeaking) {
			// Speech just stopped
			this.silenceStartTime = now;
		}

		// Calculate silence duration
		const silenceDuration =
			this.silenceStartTime > 0 ? now - this.silenceStartTime : 0;

		// Calculate speech rate (approximate)
		const speechRate = this.calculateSpeechRate();

		// Calculate volume variance
		const volumeVariance = this.calculateVolumeVariance();

		// Create analysis data
		const analysisData: AudioAnalysisData = {
			volume: this.currentVolume,
			speechRate,
			isSpeaking: this.isSpeaking,
			silenceDuration,
			averageVolume: this.averageVolume,
			volumeVariance,
		};

		// Trigger callbacks
		if (this.onAnalysisUpdate) {
			this.onAnalysisUpdate(analysisData);
		}

		if (this.onVolumeChange) {
			this.onVolumeChange(this.currentVolume, this.averageVolume);
		}

		if (this.onSpeechStateChange && wasSpeaking !== this.isSpeaking) {
			this.onSpeechStateChange(this.isSpeaking, silenceDuration);
		}
	}

	/**
	 * Calculate approximate speech rate based on volume activity
	 */
	private calculateSpeechRate(): number {
		if (this.speechEvents.length < 2) {
			return 0;
		}

		// Count volume peaks as approximate word boundaries
		let peakCount = 0;
		let lastPeak = 0;
		const minPeakInterval = 200; // minimum 200ms between peaks

		for (const event of this.speechEvents) {
			if (
				event.volume > this.averageVolume * 1.2 &&
				event.timestamp - lastPeak > minPeakInterval
			) {
				peakCount++;
				lastPeak = event.timestamp;
			}
		}

		// Convert to words per minute (rough approximation)
		const timeSpanMinutes = this.config.speechRateWindow / 60000;
		return Math.round(peakCount / timeSpanMinutes);
	}

	/**
	 * Calculate volume variance to detect engagement level
	 */
	private calculateVolumeVariance(): number {
		if (this.volumeHistory.length < 2) {
			return 0;
		}

		const mean = this.averageVolume;
		const squaredDiffs = this.volumeHistory.map((vol) => (vol - mean) ** 2);
		const variance =
			squaredDiffs.reduce((sum, diff) => sum + diff, 0) /
			this.volumeHistory.length;

		return Math.sqrt(variance);
	}

	/**
	 * Set callback for analysis updates
	 */
	onAnalysis(callback: (data: AudioAnalysisData) => void): void {
		this.onAnalysisUpdate = callback;
	}

	/**
	 * Set callback for volume changes
	 */
	onVolume(callback: (volume: number, averageVolume: number) => void): void {
		this.onVolumeChange = callback;
	}

	/**
	 * Set callback for speech state changes
	 */
	onSpeechState(
		callback: (isSpeaking: boolean, silenceDuration: number) => void,
	): void {
		this.onSpeechStateChange = callback;
	}

	/**
	 * Get current analysis data
	 */
	getCurrentAnalysis(): AudioAnalysisData {
		const now = Date.now();
		const silenceDuration =
			this.silenceStartTime > 0 ? now - this.silenceStartTime : 0;

		return {
			volume: this.currentVolume,
			speechRate: this.calculateSpeechRate(),
			isSpeaking: this.isSpeaking,
			silenceDuration,
			averageVolume: this.averageVolume,
			volumeVariance: this.calculateVolumeVariance(),
		};
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<AudioAnalysisConfig>): void {
		this.config = { ...this.config, ...newConfig };

		// Update analyser smoothing if available
		if (this.analyser) {
			this.analyser.smoothingTimeConstant = this.config.smoothingFactor;
		}

		// Restart analysis with new interval if needed
		if (newConfig.analysisInterval && this.isAnalyzing) {
			this.stopAnalysis();
			this.startAnalysis();
		}
	}

	/**
	 * Get analysis statistics
	 */
	getStats(): {
		isAnalyzing: boolean;
		volumeHistory: number[];
		speechEvents: number;
		averageVolume: number;
		currentVolume: number;
		speechRate: number;
	} {
		return {
			isAnalyzing: this.isAnalyzing,
			volumeHistory: [...this.volumeHistory],
			speechEvents: this.speechEvents.length,
			averageVolume: this.averageVolume,
			currentVolume: this.currentVolume,
			speechRate: this.calculateSpeechRate(),
		};
	}

	/**
	 * Reset analysis state
	 */
	reset(): void {
		this.currentVolume = 0;
		this.averageVolume = 0;
		this.volumeHistory = [];
		this.speechEvents = [];
		this.silenceStartTime = Date.now();
		this.isSpeaking = false;
	}

	/**
	 * Check if audio analysis is supported
	 */
	static isSupported(): boolean {
		return !!(
			window.AudioContext ||
			(window as Window & { webkitAudioContext?: typeof AudioContext })
				.webkitAudioContext
		);
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		this.stopAnalysis();

		if (this.microphone) {
			this.microphone.disconnect();
			this.microphone = null;
		}

		if (this.analyser) {
			this.analyser.disconnect();
			this.analyser = null;
		}

		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}

		this.dataArray = null;
		this.onAnalysisUpdate = null;
		this.onVolumeChange = null;
		this.onSpeechStateChange = null;
	}
}
