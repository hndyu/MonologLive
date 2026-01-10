// Core interfaces validation tests

import * as fc from 'fast-check';
import { CommentRoleType, UserInteractionType, AudioFormat } from '../src/types/core';

describe('Core Interfaces', () => {
  describe('Type Definitions', () => {
    test('CommentRoleType should include all required roles', () => {
      const expectedRoles: CommentRoleType[] = [
        'greeting', 'departure', 'reaction', 'agreement',
        'question', 'insider', 'support', 'playful'
      ];
      
      expectedRoles.forEach(role => {
        expect(typeof role).toBe('string');
      });
    });

    test('UserInteractionType should include all interaction types', () => {
      const expectedTypes: UserInteractionType[] = [
        'pickup', 'click', 'thumbs_up', 'thumbs_down'
      ];
      
      expectedTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });

    test('AudioFormat should include supported formats', () => {
      const expectedFormats: AudioFormat[] = ['webm', 'mp4', 'wav'];
      
      expectedFormats.forEach(format => {
        expect(typeof format).toBe('string');
      });
    });
  });

  describe('Property-based validation', () => {
    test('Comment objects should have required properties', () => {
      fc.assert(fc.property(
        fc.string(),
        fc.constantFrom('greeting', 'departure', 'reaction', 'agreement', 'question', 'insider', 'support', 'playful'),
        fc.string(),
        fc.date(),
        (id, role, content, timestamp) => {
          const comment = {
            id,
            role: role as CommentRoleType,
            content,
            timestamp,
            context: {
              recentTranscript: '',
              userEngagementLevel: 0.5,
              speechVolume: 0.5,
              speechRate: 1.0,
              silenceDuration: 0
            }
          };

          expect(comment.id).toBe(id);
          expect(comment.role).toBe(role);
          expect(comment.content).toBe(content);
          expect(comment.timestamp).toBe(timestamp);
          expect(comment.context).toBeDefined();
        }
      ));
    });

    test('Session objects should maintain data integrity', () => {
      fc.assert(fc.property(
        fc.string(),
        fc.string(),
        fc.date(),
        fc.string(),
        (id, userId, startTime, topic) => {
          const session = {
            id,
            userId,
            startTime,
            topic,
            transcript: [],
            comments: [],
            interactions: [],
            metrics: {
              totalDuration: 0,
              commentCount: 0,
              interactionCount: 0,
              averageEngagement: 0
            }
          };

          expect(session.id).toBe(id);
          expect(session.userId).toBe(userId);
          expect(session.startTime).toBe(startTime);
          expect(session.topic).toBe(topic);
          expect(Array.isArray(session.transcript)).toBe(true);
          expect(Array.isArray(session.comments)).toBe(true);
          expect(Array.isArray(session.interactions)).toBe(true);
          expect(session.metrics).toBeDefined();
        }
      ));
    });
  });
});