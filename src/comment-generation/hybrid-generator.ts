// Hybrid comment generator combining rule-based and local LLM processing
// Implements Requirements 2.4, 2.5, 2.6 for cost-effective hybrid generation

import type {
	CommentGenerator,
	CommentRole,
} from "../interfaces/comment-generation";
import type { Comment, ConversationContext, UserFeedback } from "../types/core";
import { RuleBasedCommentGenerator } from "./rule-based-generator";
import { WebLLMProcessor } from "./webllm-processor";

/**
 * Configuration for hybrid comment generation
 */
export interface HybridGenerationConfig {
	ruleBasedRatio: number; // 0.0 to 1.0, percentage of rule-based comments
	llmRatio: number; // 0.0 to 1.0, percentage of LLM comments
	enableAdaptiveRatio: boolean; // Adjust ratios based on performance
	performanceThreshold: number; // Max response time in ms for LLM
	fallbackToRuleBased: boolean; // Fallback when LLM fails
	maxLLMRetries: number; // Max retries for LLM generation
}

/**
 * Default hybrid configuration implementing Requirements 2.4, 2.5, 2.6
 */
export const DEFAULT_HYBRID_CONFIG: HybridGenerationConfig = {
	ruleBasedRatio: 0.7, // 70% rule-based for reliability and cost efficiency
	llmRatio: 0.3, // 30% LLM for contextual quality
	enableAdaptiveRatio: true,
	performanceThreshold: 2000, // 2 second max response time
	fallbackToRuleBased: true,
	maxLLMRetries: 2,
};

/**
 * Performance monitoring for adaptive ratio adjustment
 */
interface PerformanceMetrics {
	llmSuccessRate: number;
	llmAverageResponseTime: number;
	llmFailureCount: number;
	ruleBasedCount: number;
	llmCount: number;
	totalRequests: number;
}

/**
 * Hybrid comment generator that combines rule-based and LLM processing
 * Implements cost-effective architecture (Requirements 9.1, 9.2, 9.3)
 */
export class HybridCommentGenerator implements CommentGenerator {
	private ruleBasedGenerator: RuleBasedCommentGenerator;
	private llmProcessor: WebLLMProcessor;
	private config: HybridGenerationConfig;
	private metrics: PerformanceMetrics;
	private isLLMReady = false;

	constructor(
		config: HybridGenerationConfig = DEFAULT_HYBRID_CONFIG,
		customRoleWeights?: Partial<
			Record<import("../types/core").CommentRoleType, number>
		>,
	) {
		this.config = config;
		this.ruleBasedGenerator = new RuleBasedCommentGenerator(customRoleWeights);
		this.llmProcessor = new WebLLMProcessor();

		this.metrics = {
			llmSuccessRate: 1.0,
			llmAverageResponseTime: 1000,
			llmFailureCount: 0,
			ruleBasedCount: 0,
			llmCount: 0,
			totalRequests: 0,
		};

		// Initialize LLM in background
		this.initializeLLM();
	}

	/**
	 * Initializes the LLM processor asynchronously
	 */
	private async initializeLLM(): Promise<void> {
		try {
			if (this.llmProcessor.isAvailable()) {
				this.isLLMReady = await this.llmProcessor.loadModel();
			}
		} catch (_unused) {
			this.isLLMReady = false;
		}
	}

	/**
	 * Generates comments using hybrid strategy
	 * Implements Requirements 2.4, 2.5, 2.6
	 */
	async generateCommentAsync(
		context: ConversationContext,
	): Promise<Comment | null> {
		this.metrics.totalRequests++;

		// Determine generation method based on current ratios
		const useRuleBased = this.shouldUseRuleBased();

		if (useRuleBased || !this.isLLMReady) {
			return await this.generateRuleBasedComment(context);
		} else {
			return await this.generateLLMComment(context);
		}
	}

	/**
	 * Generates comment using hybrid approach
	 */
	async generateComment(context: ConversationContext): Promise<Comment | null> {
		this.metrics.totalRequests++;

		// For synchronous calls, always use rule-based
		return await this.generateRuleBasedComment(context);
	}

	/**
	 * Generates comment using rule-based approach
	 */
	private async generateRuleBasedComment(
		context: ConversationContext,
	): Promise<Comment | null> {
		this.metrics.ruleBasedCount++;

		const comment = await this.ruleBasedGenerator.generateComment(context);

		// If rule-based returns null, create a default comment
		if (!comment) {
			return {
				id: `hybrid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				role: "reaction",
				content: "...",
				timestamp: new Date(),
				context: { ...context },
			};
		}

		return comment;
	}

	/**
	 * Generates comment using LLM approach with fallback
	 */
	private async generateLLMComment(
		context: ConversationContext,
	): Promise<Comment | null> {
		const startTime = Date.now();
		let retries = 0;

		while (retries <= this.config.maxLLMRetries) {
			try {
				// Select appropriate role for LLM generation
				const roles = this.getActiveRoles();
				const selectedRole = this.selectRoleForContext(context, roles);

				// Generate comment using LLM
				const content = await this.llmProcessor.generateContextualComment(
					context,
					selectedRole,
				);
				const responseTime = Date.now() - startTime;

				// Update performance metrics
				this.updateLLMMetrics(true, responseTime);
				this.metrics.llmCount++;

				// Create comment object
				const comment: Comment = {
					id: `hybrid_llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					role: selectedRole.type,
					content,
					timestamp: new Date(),
					context: { ...context },
				};

				return comment;
			} catch (_unused) {
				retries++;

				if (retries > this.config.maxLLMRetries) {
					// Update failure metrics
					this.updateLLMMetrics(false, Date.now() - startTime);

					// Fallback to rule-based if enabled
					if (this.config.fallbackToRuleBased) {
						return await this.generateRuleBasedComment(context);
					} else {
						throw new Error("LLM generation failed and fallback disabled");
					}
				}
			}
		}

		// This should never be reached, but provide fallback
		return await this.generateRuleBasedComment(context);
	}

	/**
	 * Determines whether to use rule-based generation based on current ratios
	 */
	private shouldUseRuleBased(): boolean {
		// Adjust ratios if adaptive mode is enabled
		if (this.config.enableAdaptiveRatio) {
			this.adjustRatiosBasedOnPerformance();
		}

		return Math.random() < this.config.ruleBasedRatio;
	}

	/**
	 * Adjusts generation ratios based on performance metrics
	 * Implements adaptive performance optimization
	 */
	private adjustRatiosBasedOnPerformance(): void {
		const { llmSuccessRate, llmAverageResponseTime } = this.metrics;

		// Increase rule-based ratio if LLM performance is poor
		if (
			llmSuccessRate < 0.8 ||
			llmAverageResponseTime > this.config.performanceThreshold
		) {
			this.config.ruleBasedRatio = Math.min(
				0.9,
				this.config.ruleBasedRatio + 0.1,
			);
			this.config.llmRatio = 1.0 - this.config.ruleBasedRatio;
		}

		// Decrease rule-based ratio if LLM performance is excellent
		else if (
			llmSuccessRate > 0.95 &&
			llmAverageResponseTime < this.config.performanceThreshold * 0.5
		) {
			this.config.ruleBasedRatio = Math.max(
				0.5,
				this.config.ruleBasedRatio - 0.05,
			);
			this.config.llmRatio = 1.0 - this.config.ruleBasedRatio;
		}
	}

	/**
	 * Updates LLM performance metrics
	 */
	private updateLLMMetrics(success: boolean, responseTime: number): void {
		if (success) {
			// Update success rate using exponential moving average
			this.metrics.llmSuccessRate =
				0.9 * this.metrics.llmSuccessRate + 0.1 * 1.0;

			// Update average response time
			this.metrics.llmAverageResponseTime =
				0.9 * this.metrics.llmAverageResponseTime + 0.1 * responseTime;
		} else {
			this.metrics.llmFailureCount++;
			this.metrics.llmSuccessRate =
				0.9 * this.metrics.llmSuccessRate + 0.1 * 0.0;
		}
	}

	/**
	 * Selects appropriate role for LLM generation based on context
	 */
	private selectRoleForContext(
		context: ConversationContext,
		roles: CommentRole[],
	): CommentRole {
		// Simple role selection based on context
		// This could be enhanced with more sophisticated logic

		const { silenceDuration } = context;

		// Prefer questions during silence
		if (silenceDuration > 5) {
			const questionRoles = roles.filter((r) => r.type === "question");
			if (questionRoles.length > 0) {
				return questionRoles[0];
			}
		}

		// Prefer reactions for high engagement
		if (context.userEngagementLevel > 0.7) {
			const reactionRoles = roles.filter((r) => r.type === "reaction");
			if (reactionRoles.length > 0) {
				return reactionRoles[0];
			}
		}

		// Default to highest weighted role
		return (
			roles[0] || {
				type: "reaction",
				weight: 1.0,
				patterns: ["..."],
				triggers: [],
			}
		);
	}

	/**
	 * Updates role weights based on user feedback
	 */
	updateRoleWeights(feedback: UserFeedback): void {
		// Update both generators
		this.ruleBasedGenerator.updateRoleWeights(feedback);
	}

	/**
	 * Gets active roles from rule-based generator
	 */
	getActiveRoles(): CommentRole[] {
		return this.ruleBasedGenerator.getActiveRoles();
	}

	/**
	 * Sets mixing ratio for hybrid generation
	 */
	setMixingRatio(ruleBasedRatio: number, llmRatio: number): void {
		// Normalize ratios to sum to 1.0
		const total = ruleBasedRatio + llmRatio;
		if (total > 0) {
			this.config.ruleBasedRatio = ruleBasedRatio / total;
			this.config.llmRatio = llmRatio / total;
		}
	}

	/**
	 * Gets current performance metrics
	 */
	getPerformanceMetrics(): PerformanceMetrics {
		return { ...this.metrics };
	}

	/**
	 * Gets current configuration
	 */
	getConfig(): HybridGenerationConfig {
		return { ...this.config };
	}

	/**
	 * Updates configuration
	 */
	updateConfig(newConfig: Partial<HybridGenerationConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Checks if LLM is ready for generation
	 */
	isLLMAvailable(): boolean {
		return this.isLLMReady && this.llmProcessor.isReady();
	}

	/**
	 * Gets LLM model information
	 */
	getLLMModelInfo() {
		return this.llmProcessor.getModelInfo();
	}

	/**
	 * Gets LLM runtime statistics
	 */
	getLLMStats(): string {
		return this.llmProcessor.getRuntimeStats();
	}

	/**
	 * Gets rule-based generator statistics
	 */
	getRuleBasedStats() {
		return this.ruleBasedGenerator.getStats();
	}

	/**
	 * Resets all generators and metrics
	 */
	reset(): void {
		this.ruleBasedGenerator.reset();
		this.metrics = {
			llmSuccessRate: 1.0,
			llmAverageResponseTime: 1000,
			llmFailureCount: 0,
			ruleBasedCount: 0,
			llmCount: 0,
			totalRequests: 0,
		};
	}

	/**
	 * Destroys the hybrid generator and cleans up resources
	 */
	async destroy(): Promise<void> {
		await this.llmProcessor.unload();
		this.ruleBasedGenerator.reset();
	}
}
