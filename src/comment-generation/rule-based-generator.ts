// Rule-based comment generator with pattern matching and context analysis

import type { CommentRole } from "../interfaces/comment-generation";
import type {
	Comment,
	CommentRoleType,
	ConversationContext,
	UserFeedback,
} from "../types/core";
import { createAllCommentRoles, RoleSelector } from "./comment-roles";

/**
 * Configuration for comment timing and frequency
 */
export interface CommentTimingConfig {
	baseFrequency: number; // Comments per minute at normal engagement
	volumeMultiplier: number; // How much volume affects frequency
	rateMultiplier: number; // How much speech rate affects frequency
	silenceThreshold: number; // Seconds of silence before reducing frequency
	maxFrequency: number; // Maximum comments per minute
	minFrequency: number; // Minimum comments per minute
}

/**
 * Default timing configuration based on requirements 4.1, 4.2, 4.3, 4.5
 */
export const DEFAULT_TIMING_CONFIG: CommentTimingConfig = {
	baseFrequency: 3, // 3 comments per minute baseline
	volumeMultiplier: 2.0, // Double frequency at high volume
	rateMultiplier: 1.5, // 50% increase for fast speech
	silenceThreshold: 5, // Reduce after 5 seconds of silence
	maxFrequency: 8, // Max 8 comments per minute
	minFrequency: 1, // Min 1 comment per minute
};

/**
 * Rule-based comment generator implementing pattern matching and context analysis
 */
export class RuleBasedCommentGenerator {
	private roleSelector: RoleSelector;
	private timingConfig: CommentTimingConfig;
	private lastCommentTime: number = 0;
	private commentHistory: Comment[] = [];

	constructor(
		customRoleWeights?: Partial<Record<CommentRoleType, number>>,
		timingConfig: CommentTimingConfig = DEFAULT_TIMING_CONFIG,
	) {
		const roles = createAllCommentRoles(customRoleWeights);
		this.roleSelector = new RoleSelector(roles);
		this.timingConfig = timingConfig;
	}

	/**
	 * Generates a comment based on conversation context
	 * Implements requirements 2.3, 4.1, 4.2, 4.3, 4.5
	 */
	async generateComment(context: ConversationContext): Promise<Comment | null> {
		// Check if we should generate a comment based on timing
		if (!this.shouldGenerateComment(context)) {
			return null;
		}

		// Select appropriate roles based on context
		const relevantRoles = this.roleSelector.selectRoles(context);

		if (relevantRoles.length === 0) {
			return null;
		}

		// Select the best role (highest scored)
		const selectedRole = relevantRoles[0];

		// Generate comment content using pattern matching
		const content = this.generateCommentContent(selectedRole, context);

		// Create comment object
		const comment: Comment = {
			id: this.generateCommentId(),
			role: selectedRole.type,
			content,
			timestamp: new Date(),
			context: { ...context },
		};

		// Update timing and history
		this.lastCommentTime = Date.now();
		this.commentHistory.push(comment);

		// Keep history manageable
		if (this.commentHistory.length > 50) {
			this.commentHistory = this.commentHistory.slice(-25);
		}

		return comment;
	}

	/**
	 * Determines if a comment should be generated based on timing rules
	 * Implements volume and speech rate adaptation (Requirements 4.1, 4.2)
	 */
	private shouldGenerateComment(context: ConversationContext): boolean {
		const now = Date.now();
		const timeSinceLastComment = (now - this.lastCommentTime) / 1000; // seconds

		// Calculate dynamic frequency based on context
		const dynamicFrequency = this.calculateDynamicFrequency(context);
		const targetInterval = 60 / dynamicFrequency; // seconds between comments

		// Check if enough time has passed
		return timeSinceLastComment >= targetInterval;
	}

	/**
	 * Calculates comment frequency based on user engagement and speech patterns
	 * Implements Requirements 4.1, 4.2, 4.3, 4.5
	 */
	private calculateDynamicFrequency(context: ConversationContext): number {
		let frequency = this.timingConfig.baseFrequency;

		// Volume-based adjustment (Requirement 4.1)
		if (context.speechVolume > 0.7) {
			frequency *= this.timingConfig.volumeMultiplier;
		} else if (context.speechVolume > 0.4) {
			frequency *= 1.2; // Slight increase for moderate volume
		}

		// Speech rate adjustment (Requirement 4.2)
		if (context.speechRate > 1.2) {
			frequency *= this.timingConfig.rateMultiplier;
		} else if (context.speechRate > 0.8) {
			frequency *= 1.1; // Slight increase for moderate rate
		}

		// Silence period adjustment (Requirement 4.3)
		if (context.silenceDuration > this.timingConfig.silenceThreshold) {
			frequency *= 0.5; // Reduce frequency during silence
		}

		// Engagement level adjustment
		frequency *= 0.5 + context.userEngagementLevel * 0.5;

		// Apply bounds (Requirement 4.5 - maintain baseline activity)
		return Math.max(
			this.timingConfig.minFrequency,
			Math.min(this.timingConfig.maxFrequency, frequency),
		);
	}

	/**
	 * Generates comment content using pattern matching and templates
	 */
	private generateCommentContent(
		role: CommentRole,
		context: ConversationContext,
	): string {
		const patterns = role.patterns;

		// Context-aware pattern selection
		const contextualPatterns = this.filterPatternsByContext(patterns, context);
		const availablePatterns =
			contextualPatterns.length > 0 ? contextualPatterns : patterns;

		// Avoid repeating recent comments
		const recentContents = this.commentHistory.slice(-5).map((c) => c.content);

		const unusedPatterns = availablePatterns.filter(
			(p) => !recentContents.includes(p),
		);
		const finalPatterns =
			unusedPatterns.length > 0 ? unusedPatterns : availablePatterns;

		// Select random pattern
		const selectedPattern =
			finalPatterns[Math.floor(Math.random() * finalPatterns.length)];

		// Apply template processing if needed
		return this.processTemplate(selectedPattern, context);
	}

	/**
	 * Filters patterns based on conversation context
	 */
	private filterPatternsByContext(
		patterns: string[],
		context: ConversationContext,
	): string[] {
		const transcript = context.recentTranscript.toLowerCase();
		const filtered: string[] = [];

		// Simple keyword-based filtering
		for (const pattern of patterns) {
			if (this.isPatternRelevant(pattern, transcript, context)) {
				filtered.push(pattern);
			}
		}

		return filtered;
	}

	/**
	 * Checks if a pattern is relevant to the current context
	 */
	private isPatternRelevant(
		pattern: string,
		transcript: string,
		context: ConversationContext,
	): boolean {
		// Time-based relevance
		const hour = new Date().getHours();

		// Morning greetings
		if (pattern.includes("おはよう") && (hour < 6 || hour > 12)) {
			return false;
		}

		// Evening greetings
		if (pattern.includes("こんばんは") && hour < 17) {
			return false;
		}

		// Sleep-related comments
		if (pattern.includes("寝る") || pattern.includes("おやすみ")) {
			return (
				hour > 21 ||
				hour < 6 ||
				transcript.includes("疲れ") ||
				transcript.includes("眠い")
			);
		}

		// Question relevance
		if (pattern.includes("？") || pattern.includes("何")) {
			return context.silenceDuration > 3; // Ask questions during pauses
		}

		return true; // Default to relevant
	}

	/**
	 * Processes template patterns with context substitution
	 */
	private processTemplate(
		template: string,
		_context: ConversationContext,
	): string {
		// Simple template processing - can be extended
		let processed = template;

		// Add contextual variations
		if (Math.random() < 0.1) {
			// 10% chance to add emphasis
			if (!processed.includes("！") && !processed.includes("？")) {
				processed += "！";
			}
		}

		return processed;
	}

	/**
	 * Updates role weights based on user feedback
	 */
	updateRoleWeights(feedback: UserFeedback): void {
		const comment = this.commentHistory.find(
			(c) => c.id === feedback.commentId,
		);
		if (!comment) return;

		const adjustment =
			feedback.type === "positive"
				? 0.1
				: feedback.type === "negative"
					? -0.1
					: 0;

		this.roleSelector.updateRoleWeights(comment.role, adjustment);
	}

	/**
	 * Gets current active roles and their weights
	 */
	getActiveRoles(): CommentRole[] {
		return this.roleSelector.getRoles();
	}

	/**
	 * Gets current role weights
	 */
	getRoleWeights(): Record<CommentRoleType, number> {
		return this.roleSelector.getRoleWeights();
	}

	/**
	 * Updates timing configuration
	 */
	updateTimingConfig(config: Partial<CommentTimingConfig>): void {
		this.timingConfig = { ...this.timingConfig, ...config };
	}

	/**
	 * Gets comment generation statistics
	 */
	getStats(): {
		totalComments: number;
		roleDistribution: Record<CommentRoleType, number>;
		averageInterval: number;
	} {
		const roleDistribution: Partial<Record<CommentRoleType, number>> = {};

		this.commentHistory.forEach((comment) => {
			roleDistribution[comment.role] =
				(roleDistribution[comment.role] || 0) + 1;
		});

		const intervals = this.commentHistory
			.slice(1)
			.map(
				(comment, index) =>
					comment.timestamp.getTime() -
					this.commentHistory[index].timestamp.getTime(),
			);

		const averageInterval =
			intervals.length > 0
				? intervals.reduce((sum, interval) => sum + interval, 0) /
					intervals.length /
					1000
				: 0;

		return {
			totalComments: this.commentHistory.length,
			roleDistribution: roleDistribution as Record<CommentRoleType, number>,
			averageInterval,
		};
	}

	/**
	 * Generates unique comment ID
	 */
	private generateCommentId(): string {
		return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Resets generator state
	 */
	reset(): void {
		this.lastCommentTime = 0;
		this.commentHistory = [];
	}
}
