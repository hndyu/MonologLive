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
				console.log("Initializing WebLLM for hybrid generation...");
				this.isLLMReady = await this.llmProcessor.loadModel();

				if (this.isLLMReady) {
					console.log("WebLLM ready for hybrid generation");
				} else {
					console.warn("WebLLM initialization failed, using rule-based only");
				}
			} else {
				console.warn(
					"WebLLM not available in this environment, using rule-based only",
				);
			}
		} catch (error) {
			console.error("Error initializing WebLLM:", error);
			this.isLLMReady = false;
		}
	}

	/**
	 * Generates comments using hybrid strategy
	 * Implements Requirements 2.4, 2.5, 2.6
	 */
	async generateCommentAsync(context: ConversationContext): Promise<Comment> {
		this.metrics.totalRequests++;

		// Determine generation method based on current ratios
		const useRuleBased = this.shouldUseRuleBased();

		if (useRuleBased || !this.isLLMReady) {
			return this.generateRuleBasedComment(context);
		} else {
			return this.generateLLMComment(context);
		}
	}

	/**
	 * Synchronous version for compatibility with existing interface
	 */
	generateComment(context: ConversationContext): Comment {
		// For synchronous calls, always use rule-based
		return this.generateRuleBasedComment(context);
	}

	/**
	 * Generates comment using rule-based approach
	 */
	private generateRuleBasedComment(context: ConversationContext): Comment {
		this.metrics.ruleBasedCount++;

		const comment = this.ruleBasedGenerator.generateComment(context);

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
	): Promise<Comment> {
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
			} catch (error) {
				console.warn(`LLM generation attempt ${retries + 1} failed:`, error);
				retries++;

				if (retries > this.config.maxLLMRetries) {
					// Update failure metrics
					this.updateLLMMetrics(false, Date.now() - startTime);

					// Fallback to rule-based if enabled
					if (this.config.fallbackToRuleBased) {
						console.log("Falling back to rule-based generation");
						return this.generateRuleBasedComment(context);
					} else {
						throw new Error("LLM generation failed and fallback disabled");
					}
				}
			}
		}

		// This should never be reached, but provide fallback
		return this.generateRuleBasedComment(context);
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

			console.log(
				`Adjusted ratios due to poor LLM performance: Rule-based ${this.config.ruleBasedRatio}, LLM ${this.config.llmRatio}`,
			);
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

			console.log(
				`Adjusted ratios due to excellent LLM performance: Rule-based ${this.config.ruleBasedRatio}, LLM ${this.config.llmRatio}`,
			);
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

		const { silenceDuration, emotionalTone } = context;

		// Prefer questions during silence
		if (silenceDuration > 5) {
			const questionRoles = roles.filter((r) => r.type === "question");
			if (questionRoles.length > 0) {
				return questionRoles[0];
			}
		}

		// Prefer reactions for emotional content
		if (
			emotionalTone &&
			["excited", "happy", "surprised"].includes(emotionalTone)
		) {
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

		// Additional logic for LLM feedback could be added here
		console.log(
			`Updated role weights based on feedback for comment ${feedback.commentId}`,
		);
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

			console.log(
				`Updated mixing ratios: Rule-based ${this.config.ruleBasedRatio}, LLM ${this.config.llmRatio}`,
			);
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
		console.log("Updated hybrid generation config:", this.config);
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
