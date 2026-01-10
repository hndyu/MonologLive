// Comment display UI component for streaming chat-like interface

import { Comment } from '../types/core';

/**
 * Event handler types for comment interactions
 */
export interface CommentInteractionHandlers {
  onCommentClick: (commentId: string) => void;
  onThumbsUp: (commentId: string) => void;
  onThumbsDown: (commentId: string) => void;
}

/**
 * Configuration for comment display behavior
 */
export interface CommentDisplayConfig {
  maxVisibleComments: number;
  autoScroll: boolean;
  showTimestamps: boolean;
  enableInteractions: boolean;
  fadeOutDuration: number; // milliseconds
}

/**
 * Default configuration for comment display
 */
export const DEFAULT_DISPLAY_CONFIG: CommentDisplayConfig = {
  maxVisibleComments: 20,
  autoScroll: true,
  showTimestamps: false,
  enableInteractions: true,
  fadeOutDuration: 10000 // 10 seconds
};

/**
 * Comment display UI component implementing streaming chat-like interface
 * Requirements: 6.3, 6.4, 10.2
 */
export class CommentDisplay {
  private container: HTMLElement;
  private config: CommentDisplayConfig;
  private handlers: CommentInteractionHandlers;
  private comments: Comment[] = [];
  private commentElements: Map<string, HTMLElement> = new Map();
  private fadeTimeouts: Map<string, number> = new Map();
  
  constructor(
    container: HTMLElement,
    handlers: CommentInteractionHandlers,
    config: CommentDisplayConfig = DEFAULT_DISPLAY_CONFIG
  ) {
    this.container = container;
    this.handlers = handlers;
    this.config = config;
    this.initializeContainer();
  }
  
  /**
   * Initializes the container with proper styling and structure
   */
  private initializeContainer(): void {
    this.container.className = 'comment-display';
    this.container.innerHTML = '';
    
    // Apply base styles
    Object.assign(this.container.style, {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      padding: '10px',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      lineHeight: '1.4'
    });
  }
  
  /**
   * Adds a new comment to the display with streaming animation
   * Implements Requirements 6.3, 10.2
   */
  addComment(comment: Comment): void {
    this.comments.push(comment);
    
    // Remove oldest comments if exceeding max visible
    while (this.comments.length > this.config.maxVisibleComments) {
      const oldComment = this.comments.shift();
      if (oldComment) {
        this.removeCommentElement(oldComment.id);
      }
    }
    
    // Create and add comment element
    const commentElement = this.createCommentElement(comment);
    this.commentElements.set(comment.id, commentElement);
    this.container.appendChild(commentElement);
    
    // Animate entry
    this.animateCommentEntry(commentElement);
    
    // Auto-scroll if enabled
    if (this.config.autoScroll) {
      this.scrollToBottom();
    }
    
    // Set fade-out timer if configured
    if (this.config.fadeOutDuration > 0) {
      this.setFadeOutTimer(comment.id);
    }
  }
  
  /**
   * Creates HTML element for a comment with interaction controls
   * Implements Requirements 6.3, 6.4
   */
  private createCommentElement(comment: Comment): HTMLElement {
    const element = document.createElement('div');
    element.className = `comment comment-${comment.role}`;
    element.dataset.commentId = comment.id;
    
    // Apply comment styling
    Object.assign(element.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      margin: '2px 0',
      borderRadius: '8px',
      backgroundColor: this.getRoleColor(comment.role),
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      opacity: '0',
      transform: 'translateX(20px)'
    });
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'comment-content';
    contentContainer.style.flex = '1';
    
    // Add timestamp if enabled
    if (this.config.showTimestamps) {
      const timestamp = document.createElement('span');
      timestamp.className = 'comment-timestamp';
      timestamp.textContent = this.formatTimestamp(comment.timestamp);
      timestamp.style.fontSize = '11px';
      timestamp.style.opacity = '0.7';
      timestamp.style.marginRight = '8px';
      contentContainer.appendChild(timestamp);
    }
    
    // Add comment text
    const textElement = document.createElement('span');
    textElement.className = 'comment-text';
    textElement.textContent = comment.content;
    contentContainer.appendChild(textElement);
    
    element.appendChild(contentContainer);
    
    // Add interaction controls if enabled
    if (this.config.enableInteractions) {
      const controlsContainer = this.createInteractionControls(comment.id);
      element.appendChild(controlsContainer);
    }
    
    // Add click handler for comment pickup detection
    element.addEventListener('click', () => {
      this.handleCommentClick(comment.id);
    });
    
    return element;
  }
  
  /**
   * Creates interaction controls (thumbs up/down) for a comment
   * Implements Requirement 6.4
   */
  private createInteractionControls(commentId: string): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'comment-controls';
    controls.style.display = 'flex';
    controls.style.gap = '4px';
    controls.style.marginLeft = '8px';
    
    // Thumbs up button
    const thumbsUpBtn = document.createElement('button');
    thumbsUpBtn.className = 'thumbs-up-btn';
    thumbsUpBtn.innerHTML = '👍';
    thumbsUpBtn.title = 'Like this comment';
    this.styleInteractionButton(thumbsUpBtn);
    thumbsUpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleThumbsUp(commentId);
    });
    
    // Thumbs down button
    const thumbsDownBtn = document.createElement('button');
    thumbsDownBtn.className = 'thumbs-down-btn';
    thumbsDownBtn.innerHTML = '👎';
    thumbsDownBtn.title = 'Dislike this comment';
    this.styleInteractionButton(thumbsDownBtn);
    thumbsDownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleThumbsDown(commentId);
    });
    
    controls.appendChild(thumbsUpBtn);
    controls.appendChild(thumbsDownBtn);
    
    return controls;
  }
  
  /**
   * Applies consistent styling to interaction buttons
   */
  private styleInteractionButton(button: HTMLButtonElement): void {
    Object.assign(button.style, {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      padding: '2px 4px',
      borderRadius: '4px',
      opacity: '0.6',
      transition: 'opacity 0.2s ease'
    });
    
    button.addEventListener('mouseenter', () => {
      button.style.opacity = '1';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.opacity = '0.6';
    });
  }
  
  /**
   * Gets background color for comment based on role type
   */
  private getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      greeting: '#2d5a2d',
      departure: '#5a2d2d',
      reaction: '#5a4d2d',
      agreement: '#2d4d5a',
      question: '#4d2d5a',
      insider: '#5a2d4d',
      support: '#2d5a4d',
      playful: '#4d5a2d'
    };
    
    return colors[role] || '#3a3a3a';
  }
  
  /**
   * Formats timestamp for display
   */
  private formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  /**
   * Animates comment entry with slide-in effect
   */
  private animateCommentEntry(element: HTMLElement): void {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'translateX(0)';
    });
  }
  
  /**
   * Scrolls container to show latest comments
   */
  private scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }
  
  /**
   * Sets timer to fade out comment after configured duration
   */
  private setFadeOutTimer(commentId: string): void {
    const timeoutId = window.setTimeout(() => {
      this.fadeOutComment(commentId);
    }, this.config.fadeOutDuration);
    
    this.fadeTimeouts.set(commentId, timeoutId);
  }
  
  /**
   * Fades out a comment with animation
   */
  private fadeOutComment(commentId: string): void {
    const element = this.commentElements.get(commentId);
    if (element) {
      element.style.opacity = '0.3';
      element.style.transform = 'scale(0.95)';
    }
    
    // Clean up timeout
    this.fadeTimeouts.delete(commentId);
  }
  
  /**
   * Removes comment element from display
   */
  private removeCommentElement(commentId: string): void {
    const element = this.commentElements.get(commentId);
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
    
    this.commentElements.delete(commentId);
    
    // Clear any pending timeout
    const timeoutId = this.fadeTimeouts.get(commentId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.fadeTimeouts.delete(commentId);
    }
  }
  
  /**
   * Handles comment click for pickup detection
   * Implements Requirement 6.3
   */
  private handleCommentClick(commentId: string): void {
    // Add visual feedback
    const element = this.commentElements.get(commentId);
    if (element) {
      element.style.backgroundColor = '#4a4a4a';
      setTimeout(() => {
        element.style.backgroundColor = this.getRoleColor(
          element.className.split(' ').find(c => c.startsWith('comment-'))?.replace('comment-', '') || ''
        );
      }, 200);
    }
    
    // Call handler
    this.handlers.onCommentClick(commentId);
  }
  
  /**
   * Handles thumbs up interaction
   * Implements Requirement 6.4
   */
  private handleThumbsUp(commentId: string): void {
    // Add visual feedback
    const element = this.commentElements.get(commentId);
    if (element) {
      const thumbsUpBtn = element.querySelector('.thumbs-up-btn') as HTMLElement;
      if (thumbsUpBtn) {
        thumbsUpBtn.style.backgroundColor = '#2d5a2d';
        setTimeout(() => {
          thumbsUpBtn.style.backgroundColor = 'transparent';
        }, 500);
      }
    }
    
    // Call handler
    this.handlers.onThumbsUp(commentId);
  }
  
  /**
   * Handles thumbs down interaction
   * Implements Requirement 6.4
   */
  private handleThumbsDown(commentId: string): void {
    // Add visual feedback
    const element = this.commentElements.get(commentId);
    if (element) {
      const thumbsDownBtn = element.querySelector('.thumbs-down-btn') as HTMLElement;
      if (thumbsDownBtn) {
        thumbsDownBtn.style.backgroundColor = '#5a2d2d';
        setTimeout(() => {
          thumbsDownBtn.style.backgroundColor = 'transparent';
        }, 500);
      }
    }
    
    // Call handler
    this.handlers.onThumbsDown(commentId);
  }
  
  /**
   * Updates display configuration
   */
  updateConfig(newConfig: Partial<CommentDisplayConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply immediate changes
    if (newConfig.maxVisibleComments !== undefined) {
      this.trimComments();
    }
  }
  
  /**
   * Trims comments to max visible limit
   */
  private trimComments(): void {
    while (this.comments.length > this.config.maxVisibleComments) {
      const oldComment = this.comments.shift();
      if (oldComment) {
        this.removeCommentElement(oldComment.id);
      }
    }
  }
  
  /**
   * Clears all comments from display
   */
  clear(): void {
    this.comments = [];
    this.commentElements.clear();
    this.fadeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.fadeTimeouts.clear();
    this.container.innerHTML = '';
  }
  
  /**
   * Gets current comment count
   */
  getCommentCount(): number {
    return this.comments.length;
  }
  
  /**
   * Gets all visible comments
   */
  getVisibleComments(): Comment[] {
    return [...this.comments];
  }
  
  /**
   * Highlights a specific comment (useful for testing pickup detection)
   */
  highlightComment(commentId: string): void {
    const element = this.commentElements.get(commentId);
    if (element) {
      element.style.boxShadow = '0 0 10px #ffff00';
      setTimeout(() => {
        element.style.boxShadow = 'none';
      }, 1000);
    }
  }
  
  /**
   * Destroys the component and cleans up resources
   */
  destroy(): void {
    this.clear();
    this.container.innerHTML = '';
    this.container.className = '';
  }
}