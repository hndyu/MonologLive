// Integrated comment generation and display system

import { Comment, ConversationContext, UserFeedback } from '../types/core';
import { CommentGenerator } from '../interfaces/comment-generation';
import { RuleBasedCommentGenerator } from './rule-based-generator';
import { HybridCommentGenerator } from './hybrid-generator';
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
  private hybridGenerator: HybridCommentGenerator | null = null;
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
    
    // Initialize hybrid generator if local LLM is enabled
    if (config.enableLocalLLM) {
      this.hybridGenerator = new HybridCommentGenerator();
      console.log('Hybrid comment generation enabled');
    }
    
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
    
    // Use hybrid generation if available and enabled
    if (this.config.enableLocalLLM && this.hybridGenerator) {
      comment = this.hybridGenerator.generateComment(context);
    }
    // Fallback to rule-based generation
    else if (this.config.enableRuleBasedGeneration) {
      comment = this.ruleBasedGenerator.generateComment(context);
    }
    
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
    // Update both generators if available
    this.ruleBasedGenerator.updateRoleWeights(feedback);
    
    if (this.hybridGenerator) {
      this.hybridGenerator.updateRoleWeights(feedback);
    }
  }
  
  /**
   * Gets active comment roles
   */
  getActiveRoles() {
    if (this.hybridGenerator) {
      return this.hybridGenerator.getActiveRoles();
    }
    return this.ruleBasedGenerator.getActiveRoles();
  }
  
  /**
   * Sets mixing ratio for hybrid generation
   */
  setMixingRatio(ruleBasedRatio: number, llmRatio: number): void {
    if (this.hybridGenerator) {
      this.hybridGenerator.setMixingRatio(ruleBasedRatio, llmRatio);
    } else {
      console.log(`Mixing ratio set: Rule-based ${ruleBasedRatio}, LLM ${llmRatio} (LLM not available)`);
    }
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
    const ruleBasedStats = this.ruleBasedGenerator.getStats();
    
    if (this.hybridGenerator) {
      return {
        ruleBasedStats,
        hybridStats: this.hybridGenerator.getRuleBasedStats(),
        performanceMetrics: this.hybridGenerator.getPerformanceMetrics(),
        llmModelInfo: this.hybridGenerator.getLLMModelInfo(),
        isLLMReady: this.hybridGenerator.isLLMReady()
      };
    }
    
    return { ruleBasedStats };
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
    if (this.hybridGenerator) {
      return this.hybridGenerator.getActiveRoles().reduce((weights, role) => {
        weights[role.type] = role.weight;
        return weights;
      }, {} as Record<import('../types/core').CommentRoleType, number>);
    }
    return this.ruleBasedGenerator.getRoleWeights();
  }
  
  /**
   * Gets hybrid generation performance metrics
   */
  getHybridMetrics() {
    return this.hybridGenerator ? this.hybridGenerator.getPerformanceMetrics() : null;
  }
  
  /**
   * Gets LLM runtime statistics
   */
  getLLMStats(): string | null {
    return this.hybridGenerator ? this.hybridGenerator.getLLMStats() : null;
  }
  
  /**
   * Checks if hybrid generation is available and ready
   */
  isHybridReady(): boolean {
    return this.hybridGenerator ? this.hybridGenerator.isLLMReady() : false;
  }
  
  /**
   * Updates system configuration
   */
  updateConfig(newConfig: Partial<CommentSystemConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Initialize or destroy hybrid generator based on config change
    if (newConfig.enableLocalLLM !== undefined) {
      if (newConfig.enableLocalLLM && !this.hybridGenerator) {
        this.hybridGenerator = new HybridCommentGenerator();
        console.log('Hybrid comment generation enabled');
      } else if (!newConfig.enableLocalLLM && this.hybridGenerator) {
        this.hybridGenerator.destroy();
        this.hybridGenerator = null;
        console.log('Hybrid comment generation disabled');
      }
    }
    
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
  async destroy(): Promise<void> {
    if (this.display) {
      this.display.destroy();
      this.display = null;
    }
    
    this.ruleBasedGenerator.reset();
    
    if (this.hybridGenerator) {
      await this.hybridGenerator.destroy();
      this.hybridGenerator = null;
    }
  }
}