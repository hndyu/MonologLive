// Test utilities for creating valid test objects

import type { ConversationContext, UserPreferences, CommentRoleType } from "../src/types/core.js";

/**
 * Creates a valid ConversationContext with all required properties
 */
export function createTestConversationContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
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
    ...overrides
  };
}

/**
 * Creates a valid UserPreferences object with all required properties
 */
export function createTestUserPreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  const defaultRoleWeights = new Map<CommentRoleType, number>([
    ["greeting", 1.0],
    ["departure", 1.0],
    ["reaction", 1.0],
    ["agreement", 1.0],
    ["question", 1.0],
    ["insider", 1.0],
    ["support", 1.0],
    ["playful", 1.0]
  ]);

  return {
    userId: "test_user",
    roleWeights: defaultRoleWeights,
    topicPreferences: [],
    interactionHistory: [],
    sessionCount: 0,
    ...overrides
  };
}

/**
 * Creates a minimal ConversationContext for quick tests
 */
export function createMinimalContext(transcript: string = "Test"): ConversationContext {
  return createTestConversationContext({
    recentTranscript: transcript
  });
}