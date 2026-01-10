// Main learning module that integrates interaction tracking and preference learning

import { Comment, UserInteraction, UserInteractionType, ConversationContext, CommentRoleType, InteractionEvent } from '../types/core.js';
import { LearningModule } from '../interfaces/learning.js';
import { IndexedDBWrapper } from '../storage/indexeddb-wrapper.js';
import { InteractionTracker, InteractionTrackerConfig, PickupDetectionResult } from './interaction-tracker.js';
import { PreferenceLearningSystem, PreferenceLearningConfig } from './preference-learning.js';

/**
 * Configuration for the main learning module
 */
export interface LearningModuleConfig {
  interactionTracker: InteractionTrackerConfig;
  preferenceLearning: PreferenceLearningConfig;
  enableAutoPickupDetection: boolean;
  enablePreferenceLearning: boolean;
}

/**
 * Default configuration for learning module
 */
export const DEFAULT_LEARNING_MODULE_CONFIG: LearningModuleConfig = {
  interactionTracker: {
    pickupDetectionWindow: 5000,
    contentSimilarityThreshold: 0.3,
    timingWeight: 0.6,
    contentWeight: 0.4
  },
  preferenceLearning: {
    learningRate: 0.1,
    decayRate: 0.01,
    minWeight: 0.1,
    maxWeight: 2.0,
    feedbackMultiplier: {
      thumbs_up: 1.5,
      thumbs_down: -1.0,
      click: 0.3,
      pickup: 0.8
    }
  },
  enableAutoPickupDetection: true,
  enablePreferenceLearning: true
};

/**
 * Main learning module that coordinates interaction tracking and preference learning
 * Implements the LearningModule interface and Requirements 6.1-6.6, 7.1-7.5
 */
export class MainLearningModule implements LearningModule {
  private storage: IndexedDBWrapper;
  private interactionTracker: InteractionTracker;
  private preferenceLearning: PreferenceLearningSystem;
  private config: LearningModuleConfig;
  private currentUserId: string | null = null;
  private currentSessionId: string | null = null;
  
  constructor(storage: IndexedDBWrapper, config: LearningModuleConfig = DEFAULT_LEARNING_MODULE_CONFIG) {
    this.storage = storage;
    this.config = config;
    this.interactionTracker = new InteractionTracker(storage, config.interactionTracker);
    this.preferenceLearning = new PreferenceLearningSystem(storage, config.preferenceLearning);
  }
  
  /**
   * Initializes the learning module for a specific user and session
   */
  async initialize(userId: string, sessionId: string): Promise<void> {
    this.currentUserId = userId;
    this.currentSessionId = sessionId;
    
    if (this.config.enablePreferenceLearning) {
      await this.preferenceLearning.initializePreferences(userId);
    }
  }
  
  /**
   * Tracks user interaction with a comment
   * Implements Requirements 6.1, 6.2, 6.3, 6.5, 6.6
   */
  trackInteraction(comment: Comment, userResponse: { type: 'speech' | 'click' | 'feedback'; content?: string; timestamp: Date; confidence: number }): void {
    // Register comment for pickup detection
    if (this.config.enableAutoPickupDetection) {
      this.interactionTracker.registerComment(comment);
    }
    
    // Handle different types of user responses
    if (userResponse.type === 'speech' && userResponse.content) {
      // Detect potential pickup
      this.handleSpeechResponse(comment, userResponse.content, userResponse.timestamp);
    } else if (userResponse.type === 'click' || userResponse.type === 'feedback') {
      // Handle explicit interactions
      this.handleExplicitInteraction(comment, userResponse);
    }
  }
  
  /**
   * Updates user preferences based on feedback
   * Implements Requirements 7.1, 7.2, 7.3
   */
  async updatePreferences(userId: string, feedback: { commentId: string; type: 'thumbs_up' | 'thumbs_down' | 'pickup'; strength: number; timestamp: Date }): Promise<void> {
    if (!this.config.enablePreferenceLearning) {
      return;
    }
    
    // Infer comment role from comment ID (in a real system, we'd look this up)
    const commentRole = this.inferCommentRoleFromId(feedback.commentId);
    
    if (commentRole) {
      await this.preferenceLearning.updateRoleWeights(
        userId,
        commentRole,
        feedback.type,
        feedback.strength
      );
    }
  }
  
  /**
   * Gets personalized weights for comment generation
   * Implements Requirement 7.4
   */
  getPersonalizedWeights(userId: string): Map<CommentRoleType, number> {
    if (!this.config.enablePreferenceLearning) {
      // Return default equal weights
      return this.getDefaultWeights();
    }
    
    return this.preferenceLearning.getPersonalizedWeights(userId);
  }
  
  /**
   * Detects comment pickup based on subsequent speech
   * Implements Requirements 6.1, 6.2
   */
  detectCommentPickup(comment: Comment, subsequentSpeech: string, timing: number): number {
    if (!this.config.enableAutoPickupDetection) {
      return 0;
    }
    
    const speechTimestamp = new Date(Date.now() - timing);
    const results = this.interactionTracker.detectCommentPickup(subsequentSpeech, speechTimestamp);
    
    // Find the result for this specific comment (simplified approach)
    // In a real implementation, we'd match by comment ID
    const result = results.find(r => r.detected);
    return result ? result.confidence : 0;
  }
  
  /**
   * Handles speech responses for pickup detection
   */
  private handleSpeechResponse(comment: Comment, speech: string, timestamp: Date): void {
    const confidence = this.detectCommentPickup(comment, speech, Date.now() - timestamp.getTime());
    
    if (confidence > this.config.interactionTracker.contentSimilarityThreshold) {
      // Track as pickup interaction
      this.trackPickupInteraction(comment, confidence, timestamp);
    }
  }
  
  /**
   * Handles explicit user interactions (clicks, thumbs up/down)
   */
  private handleExplicitInteraction(comment: Comment, userResponse: { type: 'click' | 'feedback'; timestamp: Date; confidence: number }): void {
    if (!this.currentUserId || !this.currentSessionId) {
      console.warn('Cannot track interaction: user or session not initialized');
      return;
    }
    
    const interactionType: UserInteractionType = userResponse.type === 'click' ? 'click' : 'thumbs_up';
    
    // Track the interaction
    this.interactionTracker.trackExplicitInteraction(
      comment.id,
      interactionType,
      comment.context,
      this.currentSessionId
    );
    
    // Update preferences if enabled
    if (this.config.enablePreferenceLearning) {
      this.updatePreferences(this.currentUserId, {
        commentId: comment.id,
        type: interactionType === 'click' ? 'pickup' : 'thumbs_up',
        strength: userResponse.confidence,
        timestamp: userResponse.timestamp
      });
    }
  }
  
  /**
   * Tracks pickup interaction
   */
  private trackPickupInteraction(comment: Comment, confidence: number, timestamp: Date): void {
    if (!this.currentUserId || !this.currentSessionId) {
      return;
    }
    
    // Track the pickup
    this.interactionTracker.trackExplicitInteraction(
      comment.id,
      'pickup',
      comment.context,
      this.currentSessionId
    );
    
    // Update preferences
    if (this.config.enablePreferenceLearning) {
      this.updatePreferences(this.currentUserId, {
        commentId: comment.id,
        type: 'pickup',
        strength: confidence,
        timestamp
      });
    }
  }
  
  /**
   * Gets interaction statistics
   */
  getInteractionStats() {
    return this.interactionTracker.getInteractionStats();
  }
  
  /**
   * Gets learning statistics
   */
  getLearningStats() {
    return this.preferenceLearning.getLearningStats();
  }
  
  /**
   * Gets session interactions
   */
  async getSessionInteractions(sessionId: string): Promise<InteractionEvent[]> {
    return this.interactionTracker.getSessionInteractions(sessionId);
  }
  
  /**
   * Resets learning data
   */
  async reset(userId: string): Promise<void> {
    this.interactionTracker.clearHistory();
    if (this.config.enablePreferenceLearning) {
      await this.preferenceLearning.resetPreferences(userId);
    }
  }
  
  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<LearningModuleConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.interactionTracker) {
      this.interactionTracker.updateConfig(newConfig.interactionTracker);
    }
    
    if (newConfig.preferenceLearning) {
      this.preferenceLearning.updateConfig(newConfig.preferenceLearning);
    }
  }
  
  /**
   * Gets default role weights
   */
  private getDefaultWeights(): Map<CommentRoleType, number> {
    const roles: CommentRoleType[] = [
      'greeting', 'departure', 'reaction', 'agreement',
      'question', 'insider', 'support', 'playful'
    ];
    
    const weights = new Map<CommentRoleType, number>();
    for (const role of roles) {
      weights.set(role, 1.0);
    }
    
    return weights;
  }
  
  /**
   * Infers comment role from comment ID (placeholder implementation)
   */
  private inferCommentRoleFromId(commentId: string): CommentRoleType | null {
    // Extract role from comment ID pattern (e.g., "reaction_123456")
    const roleMatch = commentId.match(/^(\w+)_/);
    if (roleMatch) {
      const role = roleMatch[1] as CommentRoleType;
      const validRoles: CommentRoleType[] = [
        'greeting', 'departure', 'reaction', 'agreement',
        'question', 'insider', 'support', 'playful'
      ];
      
      if (validRoles.includes(role)) {
        return role;
      }
    }
    
    return 'reaction'; // Default fallback
  }
}