// Property-based tests for session summary generation
// **Feature: monolog-live, Property 10: Session Summary Generation**
// **Validates: Requirements 8.1, 8.2, 8.3, 8.5**

import { describe, it, expect, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import { 
  SummaryGeneratorImpl, 
  BasicTopicExtractor, 
  BasicInsightGenerator 
} from '../src/summary/summary-generator';
import { 
  Session, 
  SessionSummary, 
  TranscriptSegment, 
  Comment, 
  UserInteraction,
  SessionMetrics,
  CommentRoleType,
  UserInteractionType
} from '../src/types/core';

describe('Session Summary Generation Properties', () => {
  let summaryGenerator: SummaryGeneratorImpl;
  let topicExtractor: BasicTopicExtractor;
  let insightGenerator: BasicInsightGenerator;

  beforeEach(() => {
    topicExtractor = new BasicTopicExtractor();
    insightGenerator = new BasicInsightGenerator();
    summaryGenerator = new SummaryGeneratorImpl(topicExtractor, insightGenerator);
  });

  // Generators for test data
  const transcriptSegmentArb = fc.record({
    start: fc.nat(10000),
    end: fc.nat(10000),
    text: fc.string({ minLength: 1, maxLength: 100 }),
    confidence: fc.float({ min: 0, max: 1 }),
    isFinal: fc.boolean()
  }).map(segment => ({
    ...segment,
    end: Math.max(segment.start, segment.end)
  }));

  const commentRoleArb: fc.Arbitrary<CommentRoleType> = fc.constantFrom(
    'greeting', 'departure', 'reaction', 'agreement', 
    'question', 'insider', 'support', 'playful'
  );

  const userInteractionTypeArb: fc.Arbitrary<UserInteractionType> = fc.constantFrom(
    'pickup', 'click', 'thumbs_up', 'thumbs_down'
  );

  const commentArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    role: commentRoleArb,
    content: fc.string({ minLength: 1, maxLength: 200 }),
    timestamp: fc.date(),
    context: fc.record({
      recentTranscript: fc.string({ maxLength: 500 }),
      currentTopic: fc.option(fc.string({ maxLength: 50 })),
      userEngagementLevel: fc.float({ min: 0, max: 1 }),
      speechVolume: fc.float({ min: 0, max: 1 }),
      speechRate: fc.float({ min: 0, max: 2 }),
      silenceDuration: fc.nat(10000)
    })
  });

  const userInteractionArb = fc.record({
    commentId: fc.string({ minLength: 1, maxLength: 20 }),
    type: userInteractionTypeArb,
    timestamp: fc.date(),
    confidence: fc.float({ min: 0, max: 1 })
  });

  const sessionMetricsArb = fc.record({
    totalDuration: fc.nat(3600000), // up to 1 hour in ms
    commentCount: fc.nat(1000),
    interactionCount: fc.nat(500),
    averageEngagement: fc.float({ min: 0, max: 10 })
  });

  const sessionArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    userId: fc.string({ minLength: 1, maxLength: 50 }),
    startTime: fc.date(),
    endTime: fc.option(fc.date()),
    topic: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    transcript: fc.array(transcriptSegmentArb, { minLength: 0, maxLength: 50 }),
    comments: fc.array(commentArb, { minLength: 0, maxLength: 100 }),
    interactions: fc.array(userInteractionArb, { minLength: 0, maxLength: 50 }),
    metrics: sessionMetricsArb
  });

  it('Property 10: Session Summary Generation - For any completed session, the system should automatically generate organized summaries using local processing', async () => {
    await fc.assert(
      fc.asyncProperty(sessionArb, async (session) => {
        // Ensure session has some content to summarize
        if (session.transcript.length === 0) {
          session.transcript.push({
            start: 0,
            end: 1000,
            text: 'This is a test conversation',
            confidence: 1.0,
            isFinal: true
          });
        }

        const summary = await summaryGenerator.createSummary(session);

        // Requirement 8.1: System SHALL create overall conversation summary
        expect(summary).toBeDefined();
        expect(summary.sessionId).toBe(session.id);
        expect(summary.overallSummary).toBeDefined();
        expect(typeof summary.overallSummary).toBe('string');
        expect(summary.overallSummary.length).toBeGreaterThan(0);

        // Requirement 8.2: System SHALL organize content by topics discussed
        expect(summary.topics).toBeDefined();
        expect(Array.isArray(summary.topics)).toBe(true);
        
        // Each topic should have required properties
        for (const topic of summary.topics) {
          expect(topic.name).toBeDefined();
          expect(typeof topic.name).toBe('string');
          expect(topic.relevance).toBeGreaterThanOrEqual(0);
          expect(topic.relevance).toBeLessThanOrEqual(1);
          expect(topic.mentions).toBeGreaterThanOrEqual(0);
          expect(typeof topic.sentiment).toBe('number');
        }

        // Requirement 8.5: System SHALL generate summaries automatically
        expect(summary.generatedAt).toBeDefined();
        expect(summary.generatedAt).toBeInstanceOf(Date);

        // Summary should contain insights
        expect(summary.insights).toBeDefined();
        expect(Array.isArray(summary.insights)).toBe(true);
        
        // Each insight should have required properties
        for (const insight of summary.insights) {
          expect(insight.type).toBeDefined();
          expect(typeof insight.type).toBe('string');
          expect(insight.content).toBeDefined();
          expect(typeof insight.content).toBe('string');
          expect(insight.confidence).toBeGreaterThanOrEqual(0);
          expect(insight.confidence).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 10a: Topic Extraction Consistency - For any transcript text, topic extraction should produce consistent results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 1000 }),
        async (transcriptText) => {
          const topics1 = await topicExtractor.extractTopics(transcriptText);
          const topics2 = await topicExtractor.extractTopics(transcriptText);

          // Results should be consistent
          expect(topics1.length).toBe(topics2.length);
          
          for (let i = 0; i < topics1.length; i++) {
            expect(topics1[i].name).toBe(topics2[i].name);
            expect(topics1[i].relevance).toBe(topics2[i].relevance);
            expect(topics1[i].mentions).toBe(topics2[i].mentions);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 10b: Summary Completeness - For any session with transcript content, summary should include all required components', async () => {
    await fc.assert(
      fc.asyncProperty(sessionArb, async (session) => {
        // Ensure session has meaningful transcript content
        const meaningfulTranscript = session.transcript.filter(segment => 
          segment.isFinal && segment.text.trim().length > 0
        );
        
        if (meaningfulTranscript.length === 0) {
          meaningfulTranscript.push({
            start: 0,
            end: 1000,
            text: 'This is meaningful conversation content about work and life',
            confidence: 1.0,
            isFinal: true
          });
          session.transcript = meaningfulTranscript;
        }

        const summary = await summaryGenerator.createSummary(session);

        // Summary must contain all required components
        expect(summary.sessionId).toBe(session.id);
        expect(summary.topics).toBeDefined();
        expect(summary.insights).toBeDefined();
        expect(summary.overallSummary).toBeDefined();
        expect(summary.generatedAt).toBeDefined();

        // Overall summary should reference session metrics
        const summaryText = summary.overallSummary.toLowerCase();
        expect(summaryText).toContain('session');
        
        // If session had a topic, it should be mentioned
        if (session.topic) {
          expect(summaryText).toContain(session.topic.toLowerCase());
        }

        // Summary should mention comment and interaction counts
        expect(summaryText).toMatch(/\d+.*comment/);
        expect(summaryText).toMatch(/\d+.*interaction/);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 10c: Insight Generation Validity - For any session data, generated insights should be valid and relevant', async () => {
    await fc.assert(
      fc.asyncProperty(sessionArb, async (session) => {
        const topics = await topicExtractor.extractTopics(
          session.transcript
            .filter(segment => segment.isFinal)
            .map(segment => segment.text)
            .join(' ') || 'default conversation content'
        );

        const insights = await insightGenerator.generateInsights(topics, session);

        // All insights should be valid
        for (const insight of insights) {
          expect(insight.type).toBeDefined();
          expect(typeof insight.type).toBe('string');
          expect(insight.type.length).toBeGreaterThan(0);
          
          expect(insight.content).toBeDefined();
          expect(typeof insight.content).toBe('string');
          expect(insight.content.length).toBeGreaterThan(0);
          
          expect(insight.confidence).toBeGreaterThanOrEqual(0);
          expect(insight.confidence).toBeLessThanOrEqual(1);
        }

        // Insights should be relevant to session characteristics
        const durationMinutes = session.metrics.totalDuration / (1000 * 60);
        const hasLengthInsight = insights.some(insight => 
          insight.type === 'session_length'
        );
        
        // Long or very short sessions should generate length insights
        if (durationMinutes > 30 || durationMinutes < 5) {
          expect(hasLengthInsight).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});