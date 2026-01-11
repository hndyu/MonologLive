// Example integration of learning and personalization system
// This demonstrates how to use the learning module with the comment system

import { CommentSystem } from "../comment-generation/comment-system.js";
import { IndexedDBWrapper } from "../storage/indexeddb-wrapper.js";
import { PreferenceManagementUI } from "../ui/preference-management.js";
import { PreferenceLearningSystem } from "./preference-learning.js";

/**
 * Example integration class showing how to set up learning and personalization
 * Implements Requirements 7.1-7.5 integration
 */
export class LearningIntegrationExample {
	private commentSystem: CommentSystem;
	private storage: IndexedDBWrapper;
	private preferenceLearning: PreferenceLearningSystem;
	private preferenceUI: PreferenceManagementUI | null = null;

	constructor() {
		this.commentSystem = new CommentSystem();
		this.storage = new IndexedDBWrapper();
		this.preferenceLearning = new PreferenceLearningSystem(this.storage);
	}

	/**
	 * Initializes the complete learning system
	 */
	async initialize(userId: string, sessionId: string): Promise<void> {
		// Initialize storage
		await this.storage.initialize();

		// Initialize comment system with learning
		await this.commentSystem.initializeLearning(
			this.storage,
			userId,
			sessionId,
		);

		// Initialize preference learning
		await this.preferenceLearning.initializePreferences(userId);

		console.log(
			`Learning system initialized for user ${userId}, session ${sessionId}`,
		);
	}

	/**
	 * Sets up the preference management UI
	 */
	setupPreferenceUI(container: HTMLElement): void {
		this.preferenceUI = new PreferenceManagementUI(
			container,
			this.preferenceLearning,
		);
	}

	/**
	 * Demonstrates the learning workflow
	 */
	async demonstrateLearning(userId: string): Promise<void> {
		console.log("=== Learning System Demonstration ===");

		// Generate some comments
		const context = {
			recentTranscript:
				"I had a great day today, went to the park and saw some beautiful flowers",
			userEngagementLevel: 0.8,
			speechVolume: 0.7,
			speechRate: 1.2,
			silenceDuration: 0,
		};

		console.log("Generating initial comments...");
		for (let i = 0; i < 5; i++) {
			const comment = this.commentSystem.generateComment(context);
			console.log(`Generated comment: [${comment.role}] ${comment.content}`);
		}

		// Show initial preferences
		const initialWeights =
			this.preferenceLearning.getPersonalizedWeights(userId);
		console.log("\nInitial role weights:");
		for (const [role, weight] of initialWeights) {
			console.log(`  ${role}: ${weight.toFixed(2)}`);
		}

		// Simulate user interactions
		console.log("\nSimulating user interactions...");

		// User likes reaction comments
		await this.preferenceLearning.updateRoleWeights(
			userId,
			"reaction",
			"thumbs_up",
			1.0,
		);
		await this.preferenceLearning.updateRoleWeights(
			userId,
			"reaction",
			"pickup",
			0.8,
		);

		// User dislikes playful comments
		await this.preferenceLearning.updateRoleWeights(
			userId,
			"playful",
			"thumbs_down",
			1.0,
		);

		// User shows interest in supportive comments
		await this.preferenceLearning.updateRoleWeights(
			userId,
			"support",
			"click",
			0.5,
		);
		await this.preferenceLearning.updateRoleWeights(
			userId,
			"support",
			"pickup",
			0.6,
		);

		// Show updated preferences
		const updatedWeights =
			this.preferenceLearning.getPersonalizedWeights(userId);
		console.log("\nUpdated role weights after feedback:");
		for (const [role, weight] of updatedWeights) {
			console.log(`  ${role}: ${weight.toFixed(2)}`);
		}

		// Show learning statistics
		const stats = this.preferenceLearning.getLearningStats();
		console.log("\nLearning statistics:");
		console.log(`  Total feedback events: ${stats.totalFeedbackEvents}`);
		console.log(`  Average weight: ${stats.averageWeight.toFixed(2)}`);
		console.log(`  Most preferred role: ${stats.mostPreferredRole}`);
		console.log(`  Least preferred role: ${stats.leastPreferredRole}`);

		// Generate comments with updated preferences
		console.log("\nGenerating comments with learned preferences...");

		// Reinitialize comment system with updated weights
		await this.commentSystem.initializeLearning(
			this.storage,
			userId,
			"demo-session-2",
		);

		for (let i = 0; i < 5; i++) {
			const comment = this.commentSystem.generateComment(context);
			console.log(`Generated comment: [${comment.role}] ${comment.content}`);
		}

		console.log("\n=== Demonstration Complete ===");
	}

	/**
	 * Shows interaction statistics
	 */
	showInteractionStats(): void {
		const interactionStats = this.commentSystem.getInteractionStats();
		const learningStats = this.commentSystem.getLearningStats();

		console.log("\n=== System Statistics ===");

		if (interactionStats) {
			console.log("Interaction Statistics:");
			console.log(
				`  Total interactions: ${interactionStats.totalInteractions}`,
			);
			console.log(
				`  Pickup rate: ${(interactionStats.pickupRate * 100).toFixed(1)}%`,
			);
			console.log(
				`  Explicit feedback rate: ${(interactionStats.explicitFeedbackRate * 100).toFixed(1)}%`,
			);

			console.log("  Interactions by type:");
			for (const [type, count] of interactionStats.interactionsByType) {
				console.log(`    ${type}: ${count}`);
			}
		}

		if (learningStats) {
			console.log("\nLearning Statistics:");
			console.log(
				`  Total feedback events: ${learningStats.totalFeedbackEvents}`,
			);
			console.log(
				`  Average weight: ${learningStats.averageWeight.toFixed(2)}`,
			);
			console.log(`  Most preferred: ${learningStats.mostPreferredRole}`);
			console.log(`  Least preferred: ${learningStats.leastPreferredRole}`);
		}
	}

	/**
	 * Resets all learning data
	 */
	async resetLearning(userId: string): Promise<void> {
		await this.commentSystem.resetLearning();
		await this.preferenceLearning.resetPreferences(userId);
		console.log("Learning data reset to defaults");
	}

	/**
	 * Cleans up resources
	 */
	async cleanup(): Promise<void> {
		if (this.preferenceUI) {
			this.preferenceUI.destroy();
		}

		this.commentSystem.destroy();
		await this.storage.close();
	}
}

/**
 * Example usage function
 */
export async function runLearningExample(): Promise<void> {
	const example = new LearningIntegrationExample();

	try {
		// Initialize the system
		await example.initialize("demo-user-123", "demo-session-1");

		// Run the demonstration
		await example.demonstrateLearning("demo-user-123");

		// Show statistics
		example.showInteractionStats();
	} catch (error) {
		console.error("Learning example failed:", error);
	} finally {
		// Clean up
		await example.cleanup();
	}
}
