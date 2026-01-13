// Adaptive comment frequency system based on volume and speech rate

import type { AudioAnalysisData } from "../audio/audio-analyzer.js";
import type { ConversationContext } from "../types/core.js";

export interface FrequencyAdaptationConfig {
	baseFrequency: number; // base comments per minute
	volumeMultiplier: number; // how much volume affects frequency
	speechRateMultiplier: number; // how much speech rate affects frequency
	silenceReduction: number; // frequency reduction during silence (0-1)
	minFrequency: number; // minimum comments per minute
	maxFrequency: number; // maximum comments per minute
	adaptationSmoothness: number; // 0-1, higher = smoother changes
	baselineActivity: number; // minimum activity level to maintain
}

export const DEFAULT_FREQUENCY_CONFIG: FrequencyAdaptationConfig = {
	baseFrequency: 8, // 8 comments per minute baseline
	volumeMultiplier: 0.5, // moderate volume influence
	speechRateMultiplier: 0.3, // moderate speech rate influence
	silenceReduction: 0.3, // reduce to 30% during silence
	minFrequency: 2, // minimum 2 comments per minute
	maxFrequency: 20, // maximum 20 comments per minute
	adaptationSmoothness: 0.7, // smooth adaptation
	baselineActivity: 0.4, // maintain 40% baseline activity
};

export interface FrequencyState {
	currentFrequency: number; // current comments per minute
	targetFrequency: number; // target frequency based on analysis
	lastCommentTime: number; // timestamp of last comment
	commentsSinceLastMinute: number; // comments in current minute
	adaptationHistory: number[]; // recent frequency adaptations
	isInSilence: boolean; // current silence state
	silenceDuration: number; // current silence duration
}

/**
 * Manages adaptive comment frequency based on user speech patterns
 * Implements Requirements 4.1, 4.2, 4.5 for volume and speech rate adaptation
 */
export class AdaptiveFrequencyManager {
	private config: FrequencyAdaptationConfig;
	private state: FrequencyState;
	private minuteResetInterval: number | null = null;

	constructor(config: FrequencyAdaptationConfig = DEFAULT_FREQUENCY_CONFIG) {
		this.config = config;
		this.state = {
			currentFrequency: config.baseFrequency,
			targetFrequency: config.baseFrequency,
			lastCommentTime: 0,
			commentsSinceLastMinute: 0,
			adaptationHistory: [],
			isInSilence: false,
			silenceDuration: 0,
		};

		// Reset comment count every minute
		this.minuteResetInterval = window.setInterval(() => {
			this.state.commentsSinceLastMinute = 0;
		}, 60000);
	}

	/**
	 * Update frequency based on audio analysis data
	 */
	updateFromAudioAnalysis(analysisData: AudioAnalysisData): void {
		// Calculate target frequency based on audio data
		let targetFrequency = this.config.baseFrequency;

		// Volume influence: higher volume = more comments
		const volumeFactor = Math.min(2.0, analysisData.volume / 50); // normalize to 0-2 range
		targetFrequency +=
			(volumeFactor - 1) *
			this.config.volumeMultiplier *
			this.config.baseFrequency;

		// Speech rate influence: faster speech = more reactive comments
		const speechRateFactor = Math.min(2.0, analysisData.speechRate / 120); // normalize around 120 WPM
		targetFrequency +=
			(speechRateFactor - 1) *
			this.config.speechRateMultiplier *
			this.config.baseFrequency;

		// Volume variance influence: more dynamic speech = more comments
		const varianceFactor = Math.min(1.5, analysisData.volumeVariance / 20); // normalize variance
		targetFrequency += varianceFactor * 0.2 * this.config.baseFrequency;

		// Silence handling: reduce frequency during silence
		this.state.isInSilence = !analysisData.isSpeaking;
		this.state.silenceDuration = analysisData.silenceDuration;

		if (this.state.isInSilence) {
			// Gradual reduction during silence, but maintain baseline activity
			const silenceReduction = Math.min(
				this.config.silenceReduction,
				this.state.silenceDuration / 5000,
			); // gradual over 5 seconds
			const reducedFrequency = targetFrequency * (1 - silenceReduction);
			const baselineFrequency =
				this.config.baseFrequency * this.config.baselineActivity;
			targetFrequency = Math.max(reducedFrequency, baselineFrequency);
		}

		// Apply frequency bounds
		targetFrequency = Math.max(
			this.config.minFrequency,
			Math.min(this.config.maxFrequency, targetFrequency),
		);

		this.state.targetFrequency = targetFrequency;

		// Smooth adaptation to target frequency
		const adaptationRate = 1 - this.config.adaptationSmoothness;
		this.state.currentFrequency =
			this.state.currentFrequency * this.config.adaptationSmoothness +
			this.state.targetFrequency * adaptationRate;

		// Track adaptation history
		this.state.adaptationHistory.push(this.state.currentFrequency);
		if (this.state.adaptationHistory.length > 60) {
			// Keep last minute of data
			this.state.adaptationHistory.shift();
		}
	}

	/**
	 * Check if it's time to generate a comment based on current frequency
	 */
	shouldGenerateComment(): boolean {
		const now = Date.now();

		// For the first comment, always allow generation
		if (this.state.lastCommentTime === 0) {
			return true;
		}

		// Calculate time since last comment
		const timeSinceLastComment = now - this.state.lastCommentTime;

		// Calculate expected interval based on current frequency
		const expectedInterval = (60 * 1000) / this.state.currentFrequency; // milliseconds per comment

		// Add some randomness to avoid mechanical timing (±25%)
		const randomFactor = 0.75 + Math.random() * 0.5;
		const adjustedInterval = expectedInterval * randomFactor;

		// Check if enough time has passed
		const shouldGenerate = timeSinceLastComment >= adjustedInterval;

		// Also check if we're not exceeding the frequency limit
		const frequencyLimit = (60 * 1000) / this.config.maxFrequency;
		const respectsLimit = timeSinceLastComment >= frequencyLimit;

		return shouldGenerate && respectsLimit;
	}

	/**
	 * Record that a comment was generated
	 */
	recordCommentGenerated(): void {
		const now = Date.now();
		this.state.lastCommentTime = now;
		this.state.commentsSinceLastMinute++;
	}

	/**
	 * Get adaptive context for comment generation
	 */
	getAdaptiveContext(baseContext: ConversationContext): ConversationContext {
		const adaptiveContext: ConversationContext = {
			...baseContext,
			userEngagement: this.calculateEngagementLevel(),
			conversationPace: this.calculateConversationPace(),
			silenceState: {
				isInSilence: this.state.isInSilence,
				silenceDuration: this.state.silenceDuration,
			},
		};

		return adaptiveContext;
	}

	/**
	 * Calculate user engagement level based on audio patterns
	 */
	private calculateEngagementLevel(): "low" | "medium" | "high" {
		const avgFrequency =
			this.state.adaptationHistory.length > 0
				? this.state.adaptationHistory.reduce((sum, freq) => sum + freq, 0) /
					this.state.adaptationHistory.length
				: this.config.baseFrequency;

		if (avgFrequency > this.config.baseFrequency * 1.3) {
			return "high";
		} else if (avgFrequency < this.config.baseFrequency * 0.7) {
			return "low";
		} else {
			return "medium";
		}
	}

	/**
	 * Calculate conversation pace based on frequency changes
	 */
	private calculateConversationPace(): "slow" | "normal" | "fast" {
		if (this.state.adaptationHistory.length < 5) {
			return "normal";
		}

		const recent = this.state.adaptationHistory.slice(-5);
		const trend = recent[recent.length - 1] - recent[0];

		if (trend > this.config.baseFrequency * 0.3) {
			return "fast";
		} else if (trend < -this.config.baseFrequency * 0.3) {
			return "slow";
		} else {
			return "normal";
		}
	}

	/**
	 * Get current frequency state
	 */
	getFrequencyState(): FrequencyState {
		return { ...this.state };
	}

	/**
	 * Get frequency statistics
	 */
	getStats(): {
		currentFrequency: number;
		targetFrequency: number;
		averageFrequency: number;
		commentsThisMinute: number;
		timeSinceLastComment: number;
		isInSilence: boolean;
		engagementLevel: string;
		conversationPace: string;
	} {
		const now = Date.now();
		const avgFrequency =
			this.state.adaptationHistory.length > 0
				? this.state.adaptationHistory.reduce((sum, freq) => sum + freq, 0) /
					this.state.adaptationHistory.length
				: this.config.baseFrequency;

		return {
			currentFrequency: Math.round(this.state.currentFrequency * 100) / 100,
			targetFrequency: Math.round(this.state.targetFrequency * 100) / 100,
			averageFrequency: Math.round(avgFrequency * 100) / 100,
			commentsThisMinute: this.state.commentsSinceLastMinute,
			timeSinceLastComment:
				this.state.lastCommentTime > 0 ? now - this.state.lastCommentTime : 0,
			isInSilence: this.state.isInSilence,
			engagementLevel: this.calculateEngagementLevel(),
			conversationPace: this.calculateConversationPace(),
		};
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<FrequencyAdaptationConfig>): void {
		this.config = { ...this.config, ...newConfig };

		// Adjust current frequency if base frequency changed
		if (newConfig.baseFrequency) {
			const ratio = newConfig.baseFrequency / this.config.baseFrequency;
			this.state.currentFrequency *= ratio;
			this.state.targetFrequency *= ratio;
		}
	}

	/**
	 * Reset frequency state
	 */
	reset(): void {
		this.state = {
			currentFrequency: this.config.baseFrequency,
			targetFrequency: this.config.baseFrequency,
			lastCommentTime: 0,
			commentsSinceLastMinute: 0,
			adaptationHistory: [],
			isInSilence: false,
			silenceDuration: 0,
		};
	}

	/**
	 * Force generate comment (override frequency limits)
	 */
	forceComment(): void {
		this.recordCommentGenerated();
	}

	/**
	 * Get time until next comment should be generated
	 */
	getTimeUntilNextComment(): number {
		if (this.state.lastCommentTime === 0) {
			return 0; // First comment can be immediate
		}

		const now = Date.now();
		const timeSinceLastComment = now - this.state.lastCommentTime;
		const expectedInterval = (60 * 1000) / this.state.currentFrequency;

		return Math.max(0, expectedInterval - timeSinceLastComment);
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		if (this.minuteResetInterval) {
			clearInterval(this.minuteResetInterval);
			this.minuteResetInterval = null;
		}
	}
}
