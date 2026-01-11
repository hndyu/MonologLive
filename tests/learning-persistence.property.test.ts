// Property-based tests for learning persistence
// Feature: monolog-live, Property 8: Learning Persistence
// Validates: Requirements 7.1, 7.2, 7.3, 7.5

import fc from "fast-check";
import {
	DEFAULT_PREFERENCE_LEARNING_CONFIG,
	PreferenceLearningSystem,
} from "../src/learning/preference-learning";
import { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import type {
	CommentRoleType,
	UserInteractionType,
	UserPreferences,
} from "../src/types/core";

// Mock IndexedDB wrapper for testing
class MockIndexedDBWrapper extends IndexedDBWrapper {
	private preferences: Map<string, UserPreferences> = new Map();

	async initialize(): Promise<void> {
		// Mock implementation
	}

	async savePreferences(
		userId: string,
		preferences: UserPreferences,
	): Promise<void> {
		this.preferences.set(userId, { ...preferences });
	}

	async getPreferences(userId: string): Promise<UserPreferences | undefined> {
		return this.preferences.get(userId);
	}

	async saveSession(): Promise<void> {
		// Mock implementation
	}

	async getSession() {
		return undefined;
	}

	async getSessionsByUser() {
		return [];
	}

	async deleteSession(): Promise<void> {
		// Mock implementation
	}

	clearMockData(): void {
		this.preferences.clear();
	}
}

describe("Learning Persistence Properties", () => {
	let mockStorage: MockIndexedDBWrapper;

	beforeEach(() => {
		mockStorage = new MockIndexedDBWrapper();
	});

	afterEach(() => {
		mockStorage.clearMockData();
	});

	/**
	 * Property 8: Learning Persistence
	 * For any user preference changes during a session, those preferences should
	 * persist and influence behavior in subsequent sessions
	 * Validates: Requirements 7.1, 7.2, 7.3, 7.5
	 */
	test("Property 8: Learning Persistence - Preferences Persist Across Sessions", async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate user ID
				fc.string({ minLength: 5, maxLength: 20 }),
				// Generate sequence of role weight updates
				fc.array(
					fc.record({
						role: fc.constantFrom(
							"greeting" as CommentRoleType,
							"departure" as CommentRoleType,
							"reaction" as CommentRoleType,
							"agreement" as CommentRoleType,
							"question" as CommentRoleType,
							"insider" as CommentRoleType,
							"support" as CommentRoleType,
							"playful" as CommentRoleType,
						),
						interactionType: fc.constantFrom(
							"thumbs_up" as UserInteractionType,
							"thumbs_down" as UserInteractionType,
							"click" as UserInteractionType,
							"pickup" as UserInteractionType,
						),
						confidence: fc.float({
							min: Math.fround(0.1),
							max: Math.fround(1.0),
						}),
					}),
					{ minLength: 1, maxLength: 10 },
				),
				async (
					userId: string,
					interactions: Array<{
						role: CommentRoleType;
						interactionType: UserInteractionType;
						confidence: number;
					}>,
				) => {
					// Create first learning system instance (first session)
					const learningSystem1 = new PreferenceLearningSystem(
						mockStorage,
						DEFAULT_PREFERENCE_LEARNING_CONFIG,
					);

					// Initialize preferences for the user
					await learningSystem1.initializePreferences(userId);

					// Get initial weights
					const initialWeights = learningSystem1.getPersonalizedWeights(userId);

					// Apply all interactions
					for (const interaction of interactions) {
						await learningSystem1.updateRoleWeights(
							userId,
							interaction.role,
							interaction.interactionType,
							interaction.confidence,
						);
					}

					// Get weights after interactions
					const updatedWeights = learningSystem1.getPersonalizedWeights(userId);

					// Create second learning system instance (simulating new session)
					const learningSystem2 = new PreferenceLearningSystem(
						mockStorage,
						DEFAULT_PREFERENCE_LEARNING_CONFIG,
					);

					// Initialize preferences for the same user (should load from storage)
					await learningSystem2.initializePreferences(userId);

					// Get weights from second instance
					const persistedWeights =
						learningSystem2.getPersonalizedWeights(userId);

					// Property 1: Weights should persist across sessions
					let weightsMatch = true;
					for (const [role, weight] of updatedWeights) {
						const persistedWeight = persistedWeights.get(role);
						if (
							!persistedWeight ||
							Math.abs(weight - persistedWeight) > 0.001
						) {
							weightsMatch = false;
							break;
						}
					}

					// Property 2: If interactions occurred, some weights should have changed from initial
					let someWeightsChanged = false;
					if (interactions.length > 0) {
						for (const [role, initialWeight] of initialWeights) {
							const finalWeight = persistedWeights.get(role);
							if (
								finalWeight &&
								Math.abs(initialWeight - finalWeight) > 0.001
							) {
								someWeightsChanged = true;
								break;
							}
						}
					}

					// Property 3: All role types should still be present
					const allRolesPresent = persistedWeights.size === initialWeights.size;

					// Property 4: All weights should be within valid bounds
					let allWeightsValid = true;
					for (const [, weight] of persistedWeights) {
						if (
							weight < DEFAULT_PREFERENCE_LEARNING_CONFIG.minWeight ||
							weight > DEFAULT_PREFERENCE_LEARNING_CONFIG.maxWeight
						) {
							allWeightsValid = false;
							break;
						}
					}

					return (
						weightsMatch &&
						(interactions.length === 0 || someWeightsChanged) &&
						allRolesPresent &&
						allWeightsValid
					);
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property: Weight Adjustment Direction
	 * For any positive feedback, role weights should increase; for negative feedback, they should decrease
	 * Validates: Requirements 7.1, 7.2
	 */
	test("Property: Weight Adjustment Direction Based on Feedback Type", () => {
		fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 5, maxLength: 15 }),
				fc.constantFrom(
					"greeting" as CommentRoleType,
					"departure" as CommentRoleType,
					"reaction" as CommentRoleType,
					"agreement" as CommentRoleType,
					"question" as CommentRoleType,
					"insider" as CommentRoleType,
					"support" as CommentRoleType,
					"playful" as CommentRoleType,
				),
				fc.constantFrom("thumbs_up" as const, "thumbs_down" as const),
				fc.float({ min: Math.fround(0.5), max: Math.fround(1.0) }),
				async (
					userId: string,
					role: CommentRoleType,
					feedbackType: "thumbs_up" | "thumbs_down",
					confidence: number,
				) => {
					const learningSystem = new PreferenceLearningSystem(
						mockStorage,
						DEFAULT_PREFERENCE_LEARNING_CONFIG,
					);

					// Initialize preferences
					await learningSystem.initializePreferences(userId);

					// Get initial weight for the role
					const initialWeights = learningSystem.getPersonalizedWeights(userId);
					const initialWeight = initialWeights.get(role) || 1.0;

					// Apply feedback
					await learningSystem.updateRoleWeights(
						userId,
						role,
						feedbackType,
						confidence,
					);

					// Get updated weight
					const updatedWeights = learningSystem.getPersonalizedWeights(userId);
					const updatedWeight = updatedWeights.get(role) || 1.0;

					// Verify adjustment direction
					if (feedbackType === "thumbs_up") {
						return updatedWeight >= initialWeight; // Should increase or stay same
					} else {
						return updatedWeight <= initialWeight; // Should decrease or stay same
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property: Learning Statistics Consistency
	 * For any sequence of feedback events, learning statistics should accurately reflect the changes
	 * Validates: Requirements 7.3, 7.5
	 */
	test("Property: Learning Statistics Reflect Actual Changes", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 5, maxLength: 15 }),
				fc.array(
					fc.record({
						role: fc.constantFrom(
							"greeting" as CommentRoleType,
							"departure" as CommentRoleType,
							"reaction" as CommentRoleType,
							"agreement" as CommentRoleType,
							"question" as CommentRoleType,
							"insider" as CommentRoleType,
							"support" as CommentRoleType,
							"playful" as CommentRoleType,
						),
						interactionType: fc.constantFrom(
							"thumbs_up" as UserInteractionType,
							"thumbs_down" as UserInteractionType,
							"click" as UserInteractionType,
							"pickup" as UserInteractionType,
						),
						confidence: fc.float({
							min: Math.fround(0.1),
							max: Math.fround(1.0),
						}),
					}),
					{ minLength: 1, maxLength: 20 },
				),
				async (
					userId: string,
					interactions: Array<{
						role: CommentRoleType;
						interactionType: UserInteractionType;
						confidence: number;
					}>,
				) => {
					const learningSystem = new PreferenceLearningSystem(
						mockStorage,
						DEFAULT_PREFERENCE_LEARNING_CONFIG,
					);

					// Initialize preferences
					await learningSystem.initializePreferences(userId);

					// Apply all interactions
					for (const interaction of interactions) {
						await learningSystem.updateRoleWeights(
							userId,
							interaction.role,
							interaction.interactionType,
							interaction.confidence,
						);
					}

					// Get learning statistics
					const stats = learningSystem.getLearningStats();

					// Property 1: Total feedback events should match number of interactions
					const correctEventCount =
						stats.totalFeedbackEvents === interactions.length;

					// Property 2: Average weight should be within reasonable bounds
					const reasonableAverageWeight =
						stats.averageWeight >=
							DEFAULT_PREFERENCE_LEARNING_CONFIG.minWeight &&
						stats.averageWeight <= DEFAULT_PREFERENCE_LEARNING_CONFIG.maxWeight;

					// Property 3: Most and least preferred roles should be valid role types
					const validRoles: CommentRoleType[] = [
						"greeting",
						"departure",
						"reaction",
						"agreement",
						"question",
						"insider",
						"support",
						"playful",
					];
					const validMostPreferred = validRoles.includes(
						stats.mostPreferredRole,
					);
					const validLeastPreferred = validRoles.includes(
						stats.leastPreferredRole,
					);

					// Property 4: Role adjustments should have entries for roles that received feedback
					const rolesWithFeedback = new Set(interactions.map((i) => i.role));
					let roleAdjustmentsValid = true;

					for (const role of rolesWithFeedback) {
						if (!stats.roleAdjustments.has(role)) {
							roleAdjustmentsValid = false;
							break;
						}
					}

					return (
						correctEventCount &&
						reasonableAverageWeight &&
						validMostPreferred &&
						validLeastPreferred &&
						roleAdjustmentsValid
					);
				},
			),
			{ numRuns: 50 },
		);
	});

	/**
	 * Property: Multiple Users Independence
	 * For any two different users, their preference changes should not affect each other
	 * Validates: Requirements 7.5 - user-specific persistence
	 */
	test("Property: User Preference Independence", () => {
		fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 5, maxLength: 15 }),
				fc.string({ minLength: 5, maxLength: 15 }),
				fc.constantFrom(
					"reaction" as CommentRoleType,
					"support" as CommentRoleType,
					"playful" as CommentRoleType,
				),
				fc.constantFrom("thumbs_up" as const, "thumbs_down" as const),
				fc.float({ min: Math.fround(0.5), max: Math.fround(1.0) }),
				async (
					userId1: string,
					userId2: string,
					role: CommentRoleType,
					feedbackType: "thumbs_up" | "thumbs_down",
					confidence: number,
				) => {
					// Skip if users are the same (not a valid test case)
					if (userId1 === userId2) {
						return true;
					}

					const learningSystem = new PreferenceLearningSystem(
						mockStorage,
						DEFAULT_PREFERENCE_LEARNING_CONFIG,
					);

					// Initialize preferences for both users
					await learningSystem.initializePreferences(userId1);
					await learningSystem.initializePreferences(userId2);

					// Get initial weights for both users
					const user1InitialWeights =
						learningSystem.getPersonalizedWeights(userId1);
					const user2InitialWeights =
						learningSystem.getPersonalizedWeights(userId2);

					const user1InitialWeight = user1InitialWeights.get(role) || 1.0;
					const user2InitialWeight = user2InitialWeights.get(role) || 1.0;

					// Apply feedback only to user1
					await learningSystem.updateRoleWeights(
						userId1,
						role,
						feedbackType,
						confidence,
					);

					// Get updated weights
					const user1UpdatedWeights =
						learningSystem.getPersonalizedWeights(userId1);
					const user2UpdatedWeights =
						learningSystem.getPersonalizedWeights(userId2);

					const user1UpdatedWeight = user1UpdatedWeights.get(role) || 1.0;
					const user2UpdatedWeight = user2UpdatedWeights.get(role) || 1.0;

					// Property 1: User1's weight should have changed (unless at boundary)
					const user1Changed =
						Math.abs(user1UpdatedWeight - user1InitialWeight) > 0.001;

					// Property 2: User2's weight should remain unchanged
					const user2Unchanged =
						Math.abs(user2UpdatedWeight - user2InitialWeight) < 0.001;

					return (
						user2Unchanged &&
						(user1Changed ||
							user1InitialWeight ===
								DEFAULT_PREFERENCE_LEARNING_CONFIG.minWeight ||
							user1InitialWeight ===
								DEFAULT_PREFERENCE_LEARNING_CONFIG.maxWeight)
					);
				},
			),
			{ numRuns: 50 },
		);
	});

	/**
	 * Property: Reset Functionality
	 * For any user with modified preferences, resetting should restore default weights
	 * Validates: Requirements 7.5 - preference management
	 */
	test("Property: Preference Reset Restores Defaults", () => {
		fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 5, maxLength: 15 }),
				fc.array(
					fc.record({
						role: fc.constantFrom(
							"greeting" as CommentRoleType,
							"departure" as CommentRoleType,
							"reaction" as CommentRoleType,
							"agreement" as CommentRoleType,
							"question" as CommentRoleType,
							"insider" as CommentRoleType,
							"support" as CommentRoleType,
							"playful" as CommentRoleType,
						),
						interactionType: fc.constantFrom(
							"thumbs_up" as const,
							"thumbs_down" as const,
						),
						confidence: fc.float({
							min: Math.fround(0.5),
							max: Math.fround(1.0),
						}),
					}),
					{ minLength: 2, maxLength: 8 },
				),
				async (
					userId: string,
					interactions: Array<{
						role: CommentRoleType;
						interactionType: "thumbs_up" | "thumbs_down";
						confidence: number;
					}>,
				) => {
					const learningSystem = new PreferenceLearningSystem(
						mockStorage,
						DEFAULT_PREFERENCE_LEARNING_CONFIG,
					);

					// Initialize preferences
					await learningSystem.initializePreferences(userId);

					// Get initial (default) weights
					const defaultWeights = learningSystem.getPersonalizedWeights(userId);

					// Apply interactions to modify weights
					for (const interaction of interactions) {
						await learningSystem.updateRoleWeights(
							userId,
							interaction.role,
							interaction.interactionType,
							interaction.confidence,
						);
					}

					// Verify weights have changed
					const modifiedWeights = learningSystem.getPersonalizedWeights(userId);
					let weightsChanged = false;
					for (const [role, defaultWeight] of defaultWeights) {
						const modifiedWeight = modifiedWeights.get(role);
						if (
							modifiedWeight &&
							Math.abs(defaultWeight - modifiedWeight) > 0.001
						) {
							weightsChanged = true;
							break;
						}
					}

					// Reset preferences
					await learningSystem.resetPreferences(userId);

					// Get weights after reset
					const resetWeights = learningSystem.getPersonalizedWeights(userId);

					// Property 1: All weights should be back to default (1.0)
					let allWeightsDefault = true;
					for (const [, weight] of resetWeights) {
						if (Math.abs(weight - 1.0) > 0.001) {
							allWeightsDefault = false;
							break;
						}
					}

					// Property 2: Should have same number of roles as before
					const sameRoleCount = resetWeights.size === defaultWeights.size;

					return allWeightsDefault && sameRoleCount && weightsChanged;
				},
			),
			{ numRuns: 50 },
		);
	});
});
