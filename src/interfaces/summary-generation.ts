// Summary generation interfaces

import { Session, SessionSummary, Topic, Insight, AudioFile } from '../types/core.js';

export interface SummaryGenerator {
  enhanceTranscript(rawTranscript: string, audioFile?: AudioFile): Promise<string>;
  extractTopics(transcript: string): Promise<Topic[]>;
  generateInsights(topics: Topic[]): Promise<Insight[]>;
  createSummary(session: Session): Promise<SessionSummary>;
}

export interface TopicExtractor {
  extractTopics(text: string): Promise<Topic[]>;
  getTopicRelevance(topic: string, context: string): number;
}

export interface InsightGenerator {
  generateInsights(topics: Topic[], sessionData: Session): Promise<Insight[]>;
  analyzeEmotionalTone(transcript: string): Promise<number>;
  identifyConversationPatterns(session: Session): Promise<string[]>;
}