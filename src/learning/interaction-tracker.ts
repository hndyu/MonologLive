// User interaction tracking system for learning and personalization

import type { IndexedDBWrapper } from "../storage/indexeddb-wrapper.js";
import type {
	Comment,
	ConversationContext,
	InteractionEvent,
	UserInteraction,
	UserInteractionType,
} from "../types/core.js";

/**
 * Configuration for interaction tracking
 */
export interface InteractionTrackerConfig {
	pickupDetectionWindow: number; // milliseconds after comment to detect pickup
	contentSimilarityThreshold: number; // 0-1 threshold for content matching
	timingWeight: number; // weight for timing in pickup detection
	contentWeight: number; // weight for content similarity in pickup detection
}

/**
 * Default configuration for interaction tracking
 */
export const DEFAULT_INTERACTION_TRACKER_CONFIG: InteractionTrackerConfig = {
	pickupDetectionWindow: 5000, // 5 seconds
	contentSimilarityThreshold: 0.3,
	timingWeight: 0.6,
	contentWeight: 0.4,
};

/**
 * Result of pickup detection analysis
 */
export interface PickupDetectionResult {
	confidence: number;
	timingScore: number;
	contentScore: number;
	detected: boolean;
}

/**
 * User interaction tracking system
 * Implements Requirements 6.1, 6.2, 6.3, 6.5, 6.6
 */
export class InteractionTracker {
	private config: InteractionTrackerConfig;
	private recentComments: Map<string, { comment: Comment; timestamp: number }> =
		new Map();
	private interactionHistory: InteractionEvent[] = [];

	constructor(
		_storage: IndexedDBWrapper,
		config: InteractionTrackerConfig = DEFAULT_INTERACTION_TRACKER_CONFIG,
	) {
		this.config = config;
	}

	/**
	 * Registers a new comment for potential pickup detection
	 */
	registerComment(comment: Comment): void {
		this.recentComments.set(comment.id, {
			comment,
			timestamp: Date.now(),
		});

		// Clean up old comments outside detection window
		this.cleanupOldComments();
	}

	/**
	 * Detects potential comment pickup based on timing and content analysis
	 * Implements Requirements 6.1, 6.2
	 */
	detectCommentPickup(
		subsequentSpeech: string,
		speechTimestamp: Date,
	): PickupDetectionResult[] {
		const results: PickupDetectionResult[] = [];
		const speechTime = speechTimestamp.getTime();

		for (const [_commentId, { comment, timestamp }] of this.recentComments) {
			const timeDiff = speechTime - timestamp;

			// Skip if outside detection window
			if (timeDiff > this.config.pickupDetectionWindow || timeDiff < 0) {
				continue;
			}

			// Calculate timing score (closer to comment = higher score)
			const timingScore = Math.max(
				0,
				1 - timeDiff / this.config.pickupDetectionWindow,
			);

			// Calculate content similarity score
			const contentScore = this.calculateContentSimilarity(
				comment.content,
				subsequentSpeech,
			);

			// Calculate overall confidence
			const confidence =
				timingScore * this.config.timingWeight +
				contentScore * this.config.contentWeight;

			const detected = confidence > this.config.contentSimilarityThreshold;

			const result: PickupDetectionResult = {
				confidence,
				timingScore,
				contentScore,
				detected,
			};

			results.push(result);

			// If pickup detected, track the interaction
			if (detected) {
				this.trackPickupInteraction(comment, confidence, speechTimestamp);
			}
		}

		return results;
	}

	/**
	 * Tracks explicit user feedback (clicks, thumbs up/down)
	 * Implements Requirements 6.3, 6.5, 6.6
	 */
	async trackExplicitInteraction(
		commentId: string,
		type: UserInteractionType,
		context: ConversationContext,
		sessionId: string,
	): Promise<void> {
		const _interaction: UserInteraction = {
			commentId,
			type,
			timestamp: new Date(),
			confidence: 1.0, // Explicit interactions have full confidence
		};

		const interactionEvent: InteractionEvent = {
			sessionId,
			commentId,
			type,
			timestamp: new Date(),
			context: { ...context },
		};

		// Store in memory for immediate access
		this.interactionHistory.push(interactionEvent);

		// Store in IndexedDB for persistence
		await this.storeInteractionEvent(interactionEvent);

		console.log(
			`Tracked explicit interaction: ${type} for comment ${commentId}`,
		);
	}

	/**
	 * Gets interaction history for a specific session
	 */
	async getSessionInteractions(sessionId: string): Promise<InteractionEvent[]> {
		// First check memory for recent interactions
		const memoryInteractions = this.interactionHistory.filter(
			(event) => event.sessionId === sessionId,
		);

		// TODO: Also fetch from IndexedDB for complete history
		// This would require extending the IndexedDB schema to store interaction events

		return memoryInteractions;
	}

	/**
	 * Gets interaction statistics for analysis
	 */
	getInteractionStats(): {
		totalInteractions: number;
		pickupRate: number;
		explicitFeedbackRate: number;
		interactionsByType: Map<UserInteractionType, number>;
	} {
		const total = this.interactionHistory.length;
		const pickups = this.interactionHistory.filter(
			(e) => e.type === "pickup",
		).length;
		const explicit = this.interactionHistory.filter(
			(e) => e.type !== "pickup",
		).length;

		const byType = new Map<UserInteractionType, number>();
		for (const event of this.interactionHistory) {
			byType.set(event.type, (byType.get(event.type) || 0) + 1);
		}

		return {
			totalInteractions: total,
			pickupRate: total > 0 ? pickups / total : 0,
			explicitFeedbackRate: total > 0 ? explicit / total : 0,
			interactionsByType: byType,
		};
	}

	/**
	 * Clears interaction history (useful for testing or reset)
	 */
	clearHistory(): void {
		this.interactionHistory = [];
		this.recentComments.clear();
	}

	/**
	 * Updates configuration
	 */
	updateConfig(newConfig: Partial<InteractionTrackerConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Private method to track pickup interactions
	 */
	private trackPickupInteraction(
		comment: Comment,
		confidence: number,
		timestamp: Date,
	): void {
		const interaction: UserInteraction = {
			commentId: comment.id,
			type: "pickup",
			timestamp,
			confidence,
		};

		// Update the comment with interaction info
		comment.userInteraction = interaction;

		console.log(
			`Detected pickup for comment ${comment.id} with confidence ${confidence.toFixed(2)}`,
		);
	}

	/**
	 * Calculates content similarity between comment and subsequent speech
	 * Simple implementation using word overlap - can be enhanced with more sophisticated NLP
	 */
	private calculateContentSimilarity(
		commentContent: string,
		speech: string,
	): number {
		// Normalize text (lowercase, remove punctuation)
		const normalizeText = (text: string): string[] => {
			return text
				.toLowerCase()
				.replace(/[^\w\s]/g, "")
				.split(/\s+/)
				.filter((word) => word.length > 0) // Keep all non-empty words
				.filter((word) => word.trim().length > 0); // Remove whitespace-only words
		};

		const commentWords = new Set(normalizeText(commentContent));
		const speechWords = new Set(normalizeText(speech));

		// If either text has no meaningful words, return 0 similarity
		if (commentWords.size === 0 || speechWords.size === 0) {
			return 0;
		}

		// Calculate Jaccard similarity (intersection over union)
		const intersection = new Set(
			[...commentWords].filter((word) => speechWords.has(word)),
		);
		const union = new Set([...commentWords, ...speechWords]);

		// Ensure we don't divide by zero
		if (union.size === 0) {
			return 0;
		}

		return intersection.size / union.size;
	}

	/**
	 * Removes comments outside the detection window
	 */
	private cleanupOldComments(): void {
		const now = Date.now();
		const cutoff = now - this.config.pickupDetectionWindow;

		for (const [commentId, { timestamp }] of this.recentComments) {
			if (timestamp < cutoff) {
				this.recentComments.delete(commentId);
			}
		}
	}

	/**
	 * Stores interaction event in IndexedDB
	 * Note: This requires extending the IndexedDB schema to include interaction events
	 */
	private async storeInteractionEvent(event: InteractionEvent): Promise<void> {
		try {
			// For now, we'll store interaction events as part of session data
			// In a full implementation, we might want a separate store for interactions
			console.log("Storing interaction event:", event);

			// TODO: Implement proper storage when IndexedDB schema is extended
			// await this.storage.storeInteractionEvent(event);
		} catch (error) {
			console.error("Failed to store interaction event:", error);
		}
	}
}
