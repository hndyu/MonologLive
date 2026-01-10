// Comment generation interfaces for hybrid rule-based and LLM processing

import { Comment, CommentRoleType, ConversationContext, UserFeedback } from '../types/core';

export interface CommentRole {
  type: CommentRoleType;
  weight: number;
  patterns: string[];
  triggers: TriggerCondition[];
}

export interface TriggerCondition {
  type: 'keyword' | 'emotion' | 'silence' | 'volume' | 'topic';
  value: string | number;
  operator: 'equals' | 'contains' | 'greater' | 'less';
}

export interface CommentGenerator {
  generateComment(context: ConversationContext): Comment;
  updateRoleWeights(feedback: UserFeedback): void;
  getActiveRoles(): CommentRole[];
  setMixingRatio(ruleBasedRatio: number, llmRatio: number): void;
}

export interface LocalLLMProcessor {
  generateContextualComment(context: ConversationContext, role: CommentRole): Promise<string>;
  isAvailable(): boolean;
  getModelInfo(): ModelInfo;
  loadModel(): Promise<boolean>;
}

export interface ModelInfo {
  name: string;
  size: string;
  isLoaded: boolean;
  capabilities: string[];
}