// Preference learning system for comment role adaptation

import { CommentRoleType, UserPreferences, InteractionEvent, UserInteractionType } from '../types/core.js';
import { IndexedDBWrapper } from '../storage/indexeddb-wrapper.js';

/**
 * Configuration for preference learning
 */
export interface PreferenceLearningConfig {
  learningRate: number; // How quickly preferences adapt (0-1)
  decayRate: number; // How quickly old preferences fade (0-1)
  minWeight: number; // Minimum weight for any role
  maxWeight: number; // Maximum weight for any role
  feedbackMultiplier: {
    thumbs_up: number;
    thumbs_down: number;
    click: number;
    pickup: number;
  };
}

/**
 * Default configuration for preference learning
 */
export const DEFAULT_PREFERENCE_LEARNING_CONFIG: PreferenceLearningConfig = {
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
};

/**
 * Learning statistics for analysis
 */
export interface LearningStats {
  totalFeedbackEvents: number;
  roleAdjustments: Map<CommentRoleType, number>;
  averageWeight: number;
  mostPreferredRole: CommentRoleType;
  leastPreferredRole: CommentRoleType;
}

/**
 * Preference learning system that adapts comment role weights based on user feedback
 * Implements Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */
export class PreferenceLearningSystem {
  private storage: IndexedDBWrapper;
  private config: PreferenceLearningConfig;
  private currentPreferences: UserPreferences | null = null;
  private learningStats: LearningStats;
  
  constructor(storage: IndexedDBWrapper, config: PreferenceLearningConfig = DEFAULT_PREFERENCE_LEARNING_CONFIG) {
    this.storage = storage;
    this.config = config;
    this.learningStats = this.initializeLearningStats();
  }
  
  /**
   * Initializes or loads user preferences
   * Implements Requirement 7.5 - maintain preferences across sessions
   */
  async initializePreferences(userId: string): Promise<UserPreferences> {
    // Try to load existing preferences
    let preferences = await this.storage.getPreferences(userId);
    
    if (!preferences) {
      // Create default preferences with equal weights
      preferences = this.createDefaultPreferences(userId);
      await this.storage.savePreferences(userId, preferences);
    }
    
    this.currentPreferences = preferences;
    return preferences;
  }
  
  /**
   * Updates role weights based on user feedback
   * Implements Requirements 7.1, 7.2, 7.3
   */
  async updateRoleWeights(
    userId: string, 
    commentRole: CommentRoleType, 
    interactionType: UserInteractionType,
    confidence: number = 1.0
  ): Promise<void> {
    if (!this.currentPreferences) {
      await this.initializePreferences(userId);
    }
    
    if (!this.currentPreferences) {
      throw new Error('Failed to initialize preferences');
    }
    
    // Get current weight for the role
    const currentWeight = this.currentPreferences.roleWeights.get(commentRole) || 1.0;
    
    // Calculate adjustment based on interaction type and confidence
    const feedbackMultiplier = this.config.feedbackMultiplier[interactionType];
    const adjustment = feedbackMultiplier * confidence * this.config.learningRate;
    
    // Apply adjustment with bounds checking
    let newWeight = currentWeight + adjustment;
    newWeight = Math.max(this.config.minWeight, Math.min(this.config.maxWeight, newWeight));
    
    // Update the weight
    this.currentPreferences.roleWeights.set(commentRole, newWeight);
    
    // Apply decay to other roles to maintain balance
    this.applyDecayToOtherRoles(commentRole);
    
    // Update learning statistics
    this.updateLearningStats(commentRole, adjustment);
    
    // Persist the updated preferences
    await this.storage.savePreferences(userId, this.currentPreferences);
    
    console.log(`Updated weight for ${commentRole}: ${currentWeight.toFixed(2)} -> ${newWeight.toFixed(2)} (adjustment: ${adjustment.toFixed(2)})`);
  }
  
  /**
   * Gets current personalized weights for comment generation
   * Implements Requirement 7.4 - provide personalized weights
   */
  getPersonalizedWeights(userId: string): Map<CommentRoleType, number> {
    if (!this.currentPreferences || this.currentPreferences.userId !== userId) {
      // Return default weights if no preferences loaded
      return this.getDefaultRoleWeights();
    }
    
    return new Map(this.currentPreferences.roleWeights);
  }
  
  /**
   * Processes a batch of interaction events for learning
   */
  async processFeedbackBatch(userId: string, interactions: InteractionEvent[]): Promise<void> {
    for (const interaction of interactions) {
      // We need to get the comment role from the comment ID
      // This would require looking up the comment, which we'll simulate for now
      const commentRole = this.inferCommentRole(interaction.commentId);
      
      if (commentRole) {
        await this.updateRoleWeights(userId, commentRole, interaction.type);
      }
    }
  }
  
  /**
   * Gets learning statistics for analysis
   */
  getLearningStats(): LearningStats {
    return { ...this.learningStats };
  }
  
  /**
   * Resets preferences to default values
   */
  async resetPreferences(userId: string): Promise<void> {
    const defaultPreferences = this.createDefaultPreferences(userId);
    await this.storage.savePreferences(userId, defaultPreferences);
    this.currentPreferences = defaultPreferences;
    this.learningStats = this.initializeLearningStats();
  }
  
  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<PreferenceLearningConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Gets the most and least preferred roles
   */
  getPreferenceRanking(): { most: CommentRoleType; least: CommentRoleType } | null {
    if (!this.currentPreferences) {
      return null;
    }
    
    let maxWeight = -Infinity;
    let minWeight = Infinity;
    let mostPreferred: CommentRoleType = 'reaction';
    let leastPreferred: CommentRoleType = 'reaction';
    
    for (const [role, weight] of this.currentPreferences.roleWeights) {
      if (weight > maxWeight) {
        maxWeight = weight;
        mostPreferred = role;
      }
      if (weight < minWeight) {
        minWeight = weight;
        leastPreferred = role;
      }
    }
    
    return { most: mostPreferred, least: leastPreferred };
  }
  
  /**
   * Creates default preferences with equal weights
   */
  private createDefaultPreferences(userId: string): UserPreferences {
    const defaultWeights = this.getDefaultRoleWeights();
    
    return {
      userId,
      roleWeights: defaultWeights,
      topicPreferences: [],
      interactionHistory: [],
      sessionCount: 0
    };
  }
  
  /**
   * Gets default role weights (all equal)
   */
  private getDefaultRoleWeights(): Map<CommentRoleType, number> {
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
   * Applies decay to roles other than the one being reinforced
   */
  private applyDecayToOtherRoles(reinforcedRole: CommentRoleType): void {
    if (!this.currentPreferences) return;
    
    for (const [role, weight] of this.currentPreferences.roleWeights) {
      if (role !== reinforcedRole) {
        const decayedWeight = weight * (1 - this.config.decayRate);
        const boundedWeight = Math.max(this.config.minWeight, decayedWeight);
        this.currentPreferences.roleWeights.set(role, boundedWeight);
      }
    }
  }
  
  /**
   * Updates learning statistics
   */
  private updateLearningStats(role: CommentRoleType, adjustment: number): void {
    this.learningStats.totalFeedbackEvents++;
    
    const currentAdjustments = this.learningStats.roleAdjustments.get(role) || 0;
    this.learningStats.roleAdjustments.set(role, currentAdjustments + Math.abs(adjustment));
    
    // Update average weight
    if (this.currentPreferences) {
      const weights = Array.from(this.currentPreferences.roleWeights.values());
      this.learningStats.averageWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
      
      // Update most/least preferred roles
      const ranking = this.getPreferenceRanking();
      if (ranking) {
        this.learningStats.mostPreferredRole = ranking.most;
        this.learningStats.leastPreferredRole = ranking.least;
      }
    }
  }
  
  /**
   * Initializes learning statistics
   */
  private initializeLearningStats(): LearningStats {
    return {
      totalFeedbackEvents: 0,
      roleAdjustments: new Map(),
      averageWeight: 1.0,
      mostPreferredRole: 'reaction',
      leastPreferredRole: 'reaction'
    };
  }
  
  /**
   * Infers comment role from comment ID (placeholder implementation)
   * In a real system, this would look up the comment in storage
   */
  private inferCommentRole(commentId: string): CommentRoleType | null {
    // This is a placeholder - in reality we'd look up the comment
    // For now, we'll extract role from comment ID if it follows a pattern
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
    
    // Default fallback
    return 'reaction';
  }
}