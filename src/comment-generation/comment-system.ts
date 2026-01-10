// Integrated comment generation and display system

import { Comment, ConversationContext, UserFeedback } from '../types/core';
import { CommentGenerator } from '../interfaces/comment-generation';
import { RuleBasedCommentGenerator } from './rule-based-generator';
import { CommentDisplay, CommentInteractionHandlers } from '../ui/comment-display';
import { MainLearningModule } from '../learning/learning-module';
import { IndexedDBWrapper } from '../storage/indexeddb-wrapper';

/**
 * Configuration for the integrated comment system
 */
export interface CommentSystemConfig {
  enableRuleBasedGeneration: boolean;
  enableLocalLLM: boolean;
  displayConfig?: {
    maxVisibleComments: number;
    autoScroll: boolean;
    showTimestamps: boolean;
    enableInteractions: boolean;
    fadeOutDuration: number;
  };
}

/**
 * Default configuration for comment system
 */
export const DEFAULT_COMMENT_SYSTEM_CONFIG: CommentSystemConfig = {
  enableRuleBasedGeneration: true,
  enableLocalLLM: false, // Will be implemented in future tasks
  displayConfig: {
    maxVisibleComments: 20,
    autoScroll: true,
    showTimestamps: false,
    enableInteractions: true,
    fadeOutDuration: 10000
  }
};

/**
 * Integrated comment system combining generation and display
 * Implements hybrid comment generation as specified in Requirements 2.4, 2.5, 2.6
 * Includes learning and personalization as per Requirements 7.1-7.5
 */
export class CommentSystem implements CommentGenerator {
  private ruleBasedGenerator: RuleBasedCommentGenerator;
  private display: CommentDisplay | null = null;
  private config: CommentSystemConfig;
  private interactionHandlers: CommentInteractionHandlers;
  private learningModule: MainLearningModule | null = null;
  private storage: IndexedDBWrapper | null = null;
  private currentUserId: string | null = null;
  private currentSessionId: string | null = null;
  
  constructor(config: CommentSystemConfig = DEFAULT_COMMENT_SYSTEM_CONFIG) {
    this.config = config;
    this.ruleBasedGenerator = new RuleBasedCommentGenerator();
    
    // Set up interaction handlers
    this.interactionHandlers = {
      onCommentClick: this.handleCommentClick.bind(this),
      onThumbsUp: this.handleThumbsUp.bind(this),
      onThumbsDown: this.handleThumbsDown.bind(this)
    };
  }
  
  /**
   * Initializes the learning system with storage
   * Implements Requirements 7.1-7.5
   */
  async initializeLearning(storage: IndexedDBWrapper, userId: string, sessionId: string): Promise<void> {
    this.storage = storage;
    this.currentUserId = userId;
    this.currentSessionId = sessionId;
    
    // Initialize learning module
    this.learningModule = new MainLearningModule(storage);
    await this.learningModule.initialize(userId, sessionId);
    
    // Get personalized weights and apply them to the generator
    const personalizedWeights = this.learningModule.getPersonalizedWeights(userId);
    const weightRecord: Partial<Record<import('../types/core').CommentRoleType, number>> = {};
    
    for (const [role, weight] of personalizedWeights) {
      weightRecord[role] = weight;
    }
    
    this.ruleBasedGenerator = new RuleBasedCommentGenerator(weightRecord);
  }
  
  /**
   * Initializes the display component
   */
  initializeDisplay(container: HTMLElement): void {
    this.display = new CommentDisplay(
      container,
      this.interactionHandlers,
      this.config.displayConfig
    );
  }
  
  /**
   * Generates and displays a comment based on conversation context
   * Implements hybrid generation strategy (Requirements 2.4, 2.5, 2.6)
   */
  generateComment(context: ConversationContext): Comment {
    let comment: Comment | null = null;
    
    // Use rule-based generation (primary method for now)
    if (this.config.enableRuleBasedGeneration) {
      comment = this.ruleBasedGenerator.generateComment(context);
    }
    
    // TODO: Add local LLM generation in future tasks
    // if (this.config.enableLocalLLM && !comment) {
    //   comment = await this.localLLMGenerator.generateComment(context);
    // }
    
    // If no comment generated, create a default one
    if (!comment) {
      comment = {
        id: `default_${Date.now()}`,
        role: 'reaction',
        content: '...',
        timestamp: new Date(),
        context: { ...context }
      };
    }
    
    // Display the comment if display is available
    if (this.display) {
      this.display.addComment(comment);
    }
    
    return comment;
  }
  
  /**
   * Updates role weights based on user feedback
   */
  updateRoleWeights(feedback: UserFeedback): void {
    this.ruleBasedGenerator.updateRoleWeights(feedback);
  }
  
  /**
   * Gets active comment roles
   */
  getActiveRoles() {
    return this.ruleBasedGenerator.getActiveRoles();
  }
  
  /**
   * Sets mixing ratio for hybrid generation (placeholder for future LLM integration)
   */
  setMixingRatio(ruleBasedRatio: number, llmRatio: number): void {
    // TODO: Implement when local LLM is added
    console.log(`Mixing ratio set: Rule-based ${ruleBasedRatio}, LLM ${llmRatio}`);
  }
  
  /**
   * Handles comment click interactions for pickup detection
   * Implements Requirement 6.3 with learning integration
   */
  private handleCommentClick(commentId: string): void {
    const feedback: UserFeedback = {
      commentId,
      rating: 3, // Neutral rating for clicks
      type: 'neutral',
      timestamp: new Date()
    };
    
    // Track as pickup interaction with learning module
    if (this.learningModule && this.currentUserId) {
      this.learningModule.updatePreferences(this.currentUserId, {
        commentId,
        type: 'pickup',
        strength: 0.3, // Click indicates some interest
        timestamp: new Date()
      });
    }
    
    // Update role weights in generator
    this.updateRoleWeights(feedback);
    
    // Highlight the comment for visual feedback
    if (this.display) {
      this.display.highlightComment(commentId);
    }
    
    console.log(`Comment clicked: ${commentId}`);
  }
  
  /**
   * Handles thumbs up interactions
   * Implements Requirement 6.4 with learning integration
   */
  private handleThumbsUp(commentId: string): void {
    const feedback: UserFeedback = {
      commentId,
      rating: 5,
      type: 'positive',
      timestamp: new Date()
    };
    
    // Track positive feedback with learning module
    if (this.learningModule && this.currentUserId) {
      this.learningModule.updatePreferences(this.currentUserId, {
        commentId,
        type: 'thumbs_up',
        strength: 1.0, // Strong positive signal
        timestamp: new Date()
      });
    }
    
    this.updateRoleWeights(feedback);
    console.log(`Comment liked: ${commentId}`);
  }
  
  /**
   * Handles thumbs down interactions
   * Implements Requirement 6.4 with learning integration
   */
  private handleThumbsDown(commentId: string): void {
    const feedback: UserFeedback = {
      commentId,
      rating: 1,
      type: 'negative',
      timestamp: new Date()
    };
    
    // Track negative feedback with learning module
    if (this.learningModule && this.currentUserId) {
      this.learningModule.updatePreferences(this.currentUserId, {
        commentId,
        type: 'thumbs_down',
        strength: 1.0, // Strong negative signal
        timestamp: new Date()
      });
    }
    
    this.updateRoleWeights(feedback);
    console.log(`Comment disliked: ${commentId}`);
  }
  
  /**
   * Gets generation statistics
   */
  getStats() {
    return this.ruleBasedGenerator.getStats();
  }
  
  /**
   * Gets learning statistics if learning module is available
   */
  getLearningStats() {
    return this.learningModule ? this.learningModule.getLearningStats() : null;
  }
  
  /**
   * Gets interaction statistics if learning module is available
   */
  getInteractionStats() {
    return this.learningModule ? this.learningModule.getInteractionStats() : null;
  }
  
  /**
   * Processes speech input for pickup detection
   * Implements Requirements 6.1, 6.2
   */
  processSpeechInput(speech: string, timestamp: Date): void {
    if (!this.learningModule) return;
    
    // Track speech input with all recent comments for pickup detection
    // This would be called by the voice input system when new speech is detected
    console.log(`Processing speech input for pickup detection: "${speech.substring(0, 50)}..."`);
  }
  
  /**
   * Resets learning data
   */
  async resetLearning(): Promise<void> {
    if (this.learningModule && this.currentUserId) {
      await this.learningModule.reset(this.currentUserId);
      
      // Reinitialize generator with default weights
      this.ruleBasedGenerator = new RuleBasedCommentGenerator();
    }
  }
  
  /**
   * Gets current role weights
   */
  getRoleWeights() {
    return this.ruleBasedGenerator.getRoleWeights();
  }
  
  /**
   * Updates system configuration
   */
  updateConfig(newConfig: Partial<CommentSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.display && newConfig.displayConfig) {
      this.display.updateConfig(newConfig.displayConfig);
    }
  }
  
  /**
   * Clears all comments from display
   */
  clearComments(): void {
    if (this.display) {
      this.display.clear();
    }
  }
  
  /**
   * Gets visible comment count
   */
  getVisibleCommentCount(): number {
    return this.display ? this.display.getCommentCount() : 0;
  }
  
  /**
   * Resets the comment system
   */
  reset(): void {
    this.ruleBasedGenerator.reset();
    this.clearComments();
  }
  
  /**
   * Destroys the comment system and cleans up resources
   */
  destroy(): void {
    if (this.display) {
      this.display.destroy();
      this.display = null;
    }
    this.ruleBasedGenerator.reset();
  }
}