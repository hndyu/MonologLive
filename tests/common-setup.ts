// Unified test setup and utility library
// Provides common mocks, database setup, and object generation for all tests

import type {
	CommentRoleType,
	ConversationContext,
	UserPreferences,
} from "../src/types/core";
import { NaNSafeGenerator } from "./nan-safe-generator";
import {
	createMockDatabaseSetup,
	type MockDatabaseSetup,
} from "./test-database-setup";

/**
 * Unified interface for common test utilities
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Test utility class
export class CommonTestUtils {
	/**
	 * Initializes a mock database environment
	 */
	static createDatabaseSetup(): MockDatabaseSetup {
		return createMockDatabaseSetup();
	}

	/**
	 * Creates a valid ConversationContext with optional overrides
	 */
	static createConversationContext(
		overrides: Partial<ConversationContext> = {},
	): ConversationContext {
		return {
			recentTranscript: "Test transcript",
			userEngagementLevel: 0.5,
			speechVolume: 0.7,
			speechRate: 1.0,
			silenceDuration: 0,
			detectedEmotion: "neutral",
			userEngagement: "medium",
			conversationPace: "normal",
			sessionDuration: 0,
			commentHistory: [],
			...overrides,
		};
	}

	/**
	 * Creates a valid UserPreferences object with optional overrides
	 */
	static createUserPreferences(
		overrides: Partial<UserPreferences> = {},
	): UserPreferences {
		const defaultRoleWeights = new Map<CommentRoleType, number>([
			["greeting", 1.0],
			["departure", 1.0],
			["reaction", 1.0],
			["agreement", 1.0],
			["question", 1.0],
			["insider", 1.0],
			["support", 1.0],
			["playful", 1.0],
		]);

		return {
			userId: "test_user",
			roleWeights: defaultRoleWeights,
			topicPreferences: [],
			interactionHistory: [],
			sessionCount: 0,
			...overrides,
		};
	}

	/**
	 * Sets up global browser API mocks (MediaRecorder, SpeechRecognition, etc.)
	 * This is already partially handled in setup.ts but can be used for explicit reset
	 */
	static setupBrowserMocks(): void {
		// MediaRecorder mock with isTypeSupported
		const mockMediaRecorder = jest.fn().mockImplementation(() => ({
			start: jest.fn(),
			stop: jest.fn(),
			pause: jest.fn(),
			resume: jest.fn(),
			state: "inactive",
			ondataavailable: null,
			onstart: null,
			onstop: null,
			onerror: null,
		}));

		interface MockMediaRecorderType extends jest.Mock {
			isTypeSupported?: jest.Mock<boolean, [string]>;
		}

		(mockMediaRecorder as MockMediaRecorderType).isTypeSupported = jest
			.fn()
			.mockReturnValue(true);

		Object.defineProperty(window, "MediaRecorder", {
			value: mockMediaRecorder,
			configurable: true,
			writable: true,
		});
	}

	/**
	 * Validates that an object is "test-safe" (no NaN, valid ranges)
	 */
	static isSafe(obj: unknown): boolean {
		return NaNSafeGenerator.validateObject(obj);
	}

	/**
	 * Cleans up common test resources
	 */
	static cleanup(): void {
		jest.clearAllMocks();
		// Additional cleanup if needed
	}
}
