// Topic field UI component for session topic management
// Implements Requirements 5.1, 5.5

/**
 * Configuration for topic field behavior
 */
export interface TopicFieldConfig {
  placeholder: string;
  maxLength: number;
  showSuggestions: boolean;
  autoComplete: boolean;
}

/**
 * Default configuration for topic field
 */
export const DEFAULT_TOPIC_CONFIG: TopicFieldConfig = {
  placeholder: 'セッションのトピック（任意）',
  maxLength: 100,
  showSuggestions: true,
  autoComplete: true
};

/**
 * Event handlers for topic field interactions
 */
export interface TopicFieldHandlers {
  onTopicChange: (topic: string) => void;
  onTopicSubmit: (topic: string) => void;
  onTopicClear: () => void;
}

/**
 * Predefined topic suggestions for user convenience
 * Implements Requirement 5.1
 */
export const TOPIC_SUGGESTIONS: string[] = [
  '今日の出来事',
  '最近ハマってること',
  '食べ物の話',
  'アニメ・映画',
  'ゲームの話',
  '音楽について',
  '仕事・勉強',
  '趣味について',
  '旅行の話',
  '本・読書',
  '料理・レシピ',
  '健康・運動',
  '技術・プログラミング',
  '将来の話',
  '思い出話',
  '悩み相談',
  '雑談',
  '日記代わり'
];

/**
 * Topic field UI component for session topic input
 * Implements Requirements 5.1, 5.5
 */
export class TopicField {
  private container: HTMLElement;
  private config: TopicFieldConfig;
  private handlers: TopicFieldHandlers;
  private inputElement: HTMLInputElement;
  private suggestionsContainer: HTMLElement;
  private currentTopic: string = '';
  private isVisible: boolean = true;
  
  constructor(
    container: HTMLElement,
    handlers: TopicFieldHandlers,
    config: TopicFieldConfig = DEFAULT_TOPIC_CONFIG
  ) {
    this.container = container;
    this.handlers = handlers;
    this.config = config;
    this.initializeTopicField();
  }
  
  /**
   * Initializes the topic field UI
   * Implements Requirement 5.1
   */
  private initializeTopicField(): void {
    this.container.className = 'topic-field-container';
    
    // Apply container styling
    Object.assign(this.container.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '16px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef',
      marginBottom: '16px'
    });
    
    // Create label
    const label = document.createElement('label');
    label.textContent = 'セッションのトピック';
    label.className = 'topic-field-label';
    Object.assign(label.style, {
      fontSize: '14px',
      fontWeight: '500',
      color: '#495057',
      marginBottom: '4px'
    });
    
    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'topic-input-container';
    inputContainer.style.position = 'relative';
    
    // Create input element
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.className = 'topic-input';
    this.inputElement.placeholder = this.config.placeholder;
    this.inputElement.maxLength = this.config.maxLength;
    
    // Style input element
    Object.assign(this.inputElement.style, {
      width: '100%',
      padding: '12px 40px 12px 12px',
      border: '1px solid #ced4da',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: '#ffffff',
      transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
      boxSizing: 'border-box'
    });
    
    // Create clear button
    const clearButton = document.createElement('button');
    clearButton.className = 'topic-clear-btn';
    clearButton.innerHTML = '×';
    clearButton.title = 'トピックをクリア';
    clearButton.type = 'button';
    
    // Style clear button
    Object.assign(clearButton.style, {
      position: 'absolute',
      right: '8px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      fontSize: '18px',
      color: '#6c757d',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      display: 'none'
    });
    
    // Create suggestions container
    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.className = 'topic-suggestions';
    Object.assign(this.suggestionsContainer.style, {
      position: 'absolute',
      top: '100%',
      left: '0',
      right: '0',
      backgroundColor: '#ffffff',
      border: '1px solid #ced4da',
      borderTop: 'none',
      borderRadius: '0 0 6px 6px',
      maxHeight: '200px',
      overflowY: 'auto',
      zIndex: '1000',
      display: 'none'
    });
    
    // Add event listeners
    this.setupEventListeners(clearButton);
    
    // Assemble the UI
    inputContainer.appendChild(this.inputElement);
    inputContainer.appendChild(clearButton);
    inputContainer.appendChild(this.suggestionsContainer);
    
    this.container.appendChild(label);
    this.container.appendChild(inputContainer);
    
    // Initialize suggestions if enabled
    if (this.config.showSuggestions) {
      this.initializeSuggestions();
    }
  }
  
  /**
   * Sets up event listeners for topic field interactions
   */
  private setupEventListeners(clearButton: HTMLButtonElement): void {
    // Input change handler
    this.inputElement.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.currentTopic = target.value;
      
      // Show/hide clear button
      clearButton.style.display = this.currentTopic ? 'block' : 'none';
      
      // Update suggestions
      if (this.config.showSuggestions) {
        this.updateSuggestions(this.currentTopic);
      }
      
      // Notify handlers
      this.handlers.onTopicChange(this.currentTopic);
    });
    
    // Enter key handler for topic submission
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitTopic();
      } else if (e.key === 'Escape') {
        this.hideSuggestions();
      }
    });
    
    // Focus handlers for suggestions
    this.inputElement.addEventListener('focus', () => {
      if (this.config.showSuggestions && this.currentTopic.length === 0) {
        this.showAllSuggestions();
      }
    });
    
    this.inputElement.addEventListener('blur', () => {
      // Delay hiding suggestions to allow for clicks
      setTimeout(() => {
        this.hideSuggestions();
      }, 150);
    });
    
    // Clear button handler
    clearButton.addEventListener('click', () => {
      this.clearTopic();
    });
    
    // Style focus states
    this.inputElement.addEventListener('focus', () => {
      this.inputElement.style.borderColor = '#80bdff';
      this.inputElement.style.boxShadow = '0 0 0 0.2rem rgba(0, 123, 255, 0.25)';
    });
    
    this.inputElement.addEventListener('blur', () => {
      this.inputElement.style.borderColor = '#ced4da';
      this.inputElement.style.boxShadow = 'none';
    });
  }
  
  /**
   * Initializes topic suggestions
   * Implements Requirement 5.1
   */
  private initializeSuggestions(): void {
    // Create suggestion items
    TOPIC_SUGGESTIONS.forEach(suggestion => {
      const suggestionElement = this.createSuggestionElement(suggestion);
      this.suggestionsContainer.appendChild(suggestionElement);
    });
  }
  
  /**
   * Creates a suggestion element
   */
  private createSuggestionElement(suggestion: string): HTMLElement {
    const element = document.createElement('div');
    element.className = 'topic-suggestion-item';
    element.textContent = suggestion;
    element.dataset.suggestion = suggestion;
    
    // Style suggestion element
    Object.assign(element.style, {
      padding: '8px 12px',
      cursor: 'pointer',
      borderBottom: '1px solid #f8f9fa',
      fontSize: '14px',
      color: '#495057',
      transition: 'background-color 0.15s ease'
    });
    
    // Add hover effects
    element.addEventListener('mouseenter', () => {
      element.style.backgroundColor = '#f8f9fa';
    });
    
    element.addEventListener('mouseleave', () => {
      element.style.backgroundColor = 'transparent';
    });
    
    // Add click handler
    element.addEventListener('click', () => {
      this.selectSuggestion(suggestion);
    });
    
    return element;
  }
  
  /**
   * Updates suggestions based on input
   */
  private updateSuggestions(input: string): void {
    if (!input) {
      this.showAllSuggestions();
      return;
    }
    
    const filteredSuggestions = TOPIC_SUGGESTIONS.filter(suggestion =>
      suggestion.toLowerCase().includes(input.toLowerCase())
    );
    
    // Clear current suggestions
    this.suggestionsContainer.innerHTML = '';
    
    // Add filtered suggestions
    filteredSuggestions.forEach(suggestion => {
      const suggestionElement = this.createSuggestionElement(suggestion);
      this.suggestionsContainer.appendChild(suggestionElement);
    });
    
    // Show/hide suggestions container
    if (filteredSuggestions.length > 0) {
      this.suggestionsContainer.style.display = 'block';
    } else {
      this.suggestionsContainer.style.display = 'none';
    }
  }
  
  /**
   * Shows all available suggestions
   */
  private showAllSuggestions(): void {
    this.suggestionsContainer.innerHTML = '';
    TOPIC_SUGGESTIONS.forEach(suggestion => {
      const suggestionElement = this.createSuggestionElement(suggestion);
      this.suggestionsContainer.appendChild(suggestionElement);
    });
    this.suggestionsContainer.style.display = 'block';
  }
  
  /**
   * Hides suggestions container
   */
  private hideSuggestions(): void {
    this.suggestionsContainer.style.display = 'none';
  }
  
  /**
   * Selects a suggestion and updates the input
   */
  private selectSuggestion(suggestion: string): void {
    this.inputElement.value = suggestion;
    this.currentTopic = suggestion;
    this.hideSuggestions();
    
    // Show clear button
    const clearButton = this.container.querySelector('.topic-clear-btn') as HTMLElement;
    if (clearButton) {
      clearButton.style.display = 'block';
    }
    
    // Notify handlers
    this.handlers.onTopicChange(this.currentTopic);
  }
  
  /**
   * Submits the current topic
   * Implements Requirement 5.5
   */
  private submitTopic(): void {
    const topic = this.currentTopic.trim();
    this.handlers.onTopicSubmit(topic);
    this.hideSuggestions();
  }
  
  /**
   * Clears the topic field
   */
  private clearTopic(): void {
    this.inputElement.value = '';
    this.currentTopic = '';
    this.hideSuggestions();
    
    // Hide clear button
    const clearButton = this.container.querySelector('.topic-clear-btn') as HTMLElement;
    if (clearButton) {
      clearButton.style.display = 'none';
    }
    
    // Focus input
    this.inputElement.focus();
    
    // Notify handlers
    this.handlers.onTopicClear();
    this.handlers.onTopicChange('');
  }
  
  /**
   * Gets the current topic value
   */
  getCurrentTopic(): string {
    return this.currentTopic;
  }
  
  /**
   * Sets the topic value programmatically
   */
  setTopic(topic: string): void {
    this.inputElement.value = topic;
    this.currentTopic = topic;
    
    // Show/hide clear button
    const clearButton = this.container.querySelector('.topic-clear-btn') as HTMLElement;
    if (clearButton) {
      clearButton.style.display = topic ? 'block' : 'none';
    }
    
    // Notify handlers
    this.handlers.onTopicChange(topic);
  }
  
  /**
   * Shows or hides the topic field
   * Implements Requirement 5.1 (optional topic handling)
   */
  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.container.style.display = visible ? 'flex' : 'none';
  }
  
  /**
   * Checks if topic field is visible
   */
  isTopicFieldVisible(): boolean {
    return this.isVisible;
  }
  
  /**
   * Updates the configuration
   */
  updateConfig(newConfig: Partial<TopicFieldConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply configuration changes
    if (newConfig.placeholder) {
      this.inputElement.placeholder = newConfig.placeholder;
    }
    
    if (newConfig.maxLength) {
      this.inputElement.maxLength = newConfig.maxLength;
    }
    
    if (newConfig.showSuggestions !== undefined) {
      if (newConfig.showSuggestions && !this.config.showSuggestions) {
        this.initializeSuggestions();
      } else if (!newConfig.showSuggestions) {
        this.hideSuggestions();
      }
    }
  }
  
  /**
   * Focuses the topic input field
   */
  focus(): void {
    this.inputElement.focus();
  }
  
  /**
   * Validates the current topic
   */
  isValid(): boolean {
    return this.currentTopic.length <= this.config.maxLength;
  }
  
  /**
   * Gets topic field statistics
   */
  getStats() {
    return {
      currentTopic: this.currentTopic,
      topicLength: this.currentTopic.length,
      maxLength: this.config.maxLength,
      isVisible: this.isVisible,
      suggestionsEnabled: this.config.showSuggestions
    };
  }
  
  /**
   * Destroys the topic field and cleans up resources
   */
  destroy(): void {
    this.hideSuggestions();
    this.container.innerHTML = '';
    this.container.className = '';
  }
}