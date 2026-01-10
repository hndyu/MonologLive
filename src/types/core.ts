// Core data types for MONOLOG LIVE

export type CommentRoleType = 
  | 'greeting'
  | 'departure' 
  | 'reaction'
  | 'agreement'
  | 'question'
  | 'insider'
  | 'support'
  | 'playful';

export type UserInteractionType = 'pickup' | 'click' | 'thumbs_up' | 'thumbs_down';

export type AudioFormat = 'webm' | 'mp4' | 'wav';

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'error';

export interface Comment {
  id: string;
  role: CommentRoleType;
  content: string;
  timestamp: Date;
  context: ConversationContext;
  userInteraction?: UserInteraction;
}

export interface ConversationContext {
  recentTranscript: string;
  currentTopic?: string;
  userEngagementLevel: number;
  speechVolume: number;
  speechRate: number;
  silenceDuration: number;
  // New properties for adaptive frequency
  userEngagement?: 'low' | 'medium' | 'high';
  conversationPace?: 'slow' | 'normal' | 'fast';
  silenceState?: {
    isInSilence: boolean;
    silenceDuration: number;
  };
}

export interface UserInteraction {
  commentId: string;
  type: UserInteractionType;
  timestamp: Date;
  confidence: number;
}

export interface Session {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  topic?: string;
  transcript: TranscriptSegment[];
  comments: Comment[];
  interactions: UserInteraction[];
  metrics: SessionMetrics;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
  isFinal: boolean;
}

export interface SessionMetrics {
  totalDuration: number;
  commentCount: number;
  interactionCount: number;
  averageEngagement: number;
}

export interface UserPreferences {
  userId: string;
  roleWeights: Map<CommentRoleType, number>;
  topicPreferences: string[];
  interactionHistory: InteractionEvent[];
  sessionCount: number;
}

export interface InteractionEvent {
  sessionId: string;
  commentId: string;
  type: UserInteractionType;
  timestamp: Date;
  context: ConversationContext;
}

export interface ActivityEvent {
  type: 'speech' | 'comment' | 'interaction' | 'silence';
  timestamp: Date;
  data: any;
  duration?: number;
}

export interface UserFeedback {
  commentId: string;
  rating: number;
  type: 'positive' | 'negative' | 'neutral';
  timestamp: Date;
}

export interface AudioFile {
  id: string;
  sessionId: string;
  filename: string;
  format: AudioFormat;
  duration: number;
  size: number;
  createdAt: Date;
  quality: AudioQualitySettings;
}

export interface AudioQualitySettings {
  bitrate: number;
  sampleRate: number;
  channels: number;
}

export interface StorageInfo {
  used: number;
  available: number;
  quota: number;
}

export interface SessionSummary {
  sessionId: string;
  topics: Topic[];
  insights: Insight[];
  overallSummary: string;
  generatedAt: Date;
}

export interface Topic {
  name: string;
  relevance: number;
  mentions: number;
  sentiment: number;
}

export interface Insight {
  type: string;
  content: string;
  confidence: number;
}