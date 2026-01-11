// Topic management system for session topic handling and comment influence
// Implements Requirements 5.1, 5.5

import { ConversationStarterGenerator } from "../comment-generation/conversation-starters";
import type { Comment, ConversationContext } from "../types/core";

/**
 * Topic change event data
 */
export interface TopicChangeEvent {
	previousTopic: string | null;
	newTopic: string | null;
	timestamp: Date;
	source: "user_input" | "auto_detection" | "system";
}

/**
 * Topic influence configuration
 */
export interface TopicInfluenceConfig {
	enableAutoDetection: boolean;
	influenceCommentGeneration: boolean;
	suggestTopicChanges: boolean;
	trackTopicProgression: boolean;
}

/**
 * Default topic influence configuration
 */
export const DEFAULT_TOPIC_INFLUENCE_CONFIG: TopicInfluenceConfig = {
	enableAutoDetection: true,
	influenceCommentGeneration: true,
	suggestTopicChanges: true,
	trackTopicProgression: true,
};

/**
 * Topic progression tracking
 */
export interface TopicProgression {
	topic: string;
	startTime: Date;
	endTime?: Date;
	duration?: number;
	commentCount: number;
	userEngagement: number;
}

/**
 * Topic management system for handling session topics and their influence on comments
 * Implements Requirements 5.1, 5.5
 */
export class TopicManager {
	private currentTopic: string | null = null;
	private config: TopicInfluenceConfig;
	private conversationStarter: ConversationStarterGenerator;
	private topicHistory: TopicChangeEvent[] = [];
	private topicProgression: TopicProgression[] = [];
	private listeners: ((event: TopicChangeEvent) => void)[] = [];

	constructor(
		sessionId: string,
		config: TopicInfluenceConfig = DEFAULT_TOPIC_INFLUENCE_CONFIG,
	) {
		this.sessionId = sessionId;
		this.config = config;
		this.conversationStarter = new ConversationStarterGenerator();
	}

	/**
	 * Sets the session topic from user input
	 * Implements Requirement 5.1
	 */
	setTopic(
		topic: string | null,
		source: "user_input" | "auto_detection" | "system" = "user_input",
	): void {
		const previousTopic = this.currentTopic;

		// Normalize empty strings to null
		const normalizedTopic = topic?.trim() ? topic.trim() : null;

		// Only update if topic actually changed
		if (previousTopic !== normalizedTopic) {
			// End current topic progression if exists
			if (previousTopic && this.config.trackTopicProgression) {
				this.endCurrentTopicProgression();
			}

			// Update current topic
			this.currentTopic = normalizedTopic;

			// Create topic change event
			const changeEvent: TopicChangeEvent = {
				previousTopic,
				newTopic: normalizedTopic,
				timestamp: new Date(),
				source,
			};

			// Add to history
			this.topicHistory.push(changeEvent);

			// Start new topic progression if topic is set
			if (normalizedTopic && this.config.trackTopicProgression) {
				this.startNewTopicProgression(normalizedTopic);
			}

			// Notify listeners
			this.notifyListeners(changeEvent);

			console.log(
				`Topic changed from "${previousTopic}" to "${normalizedTopic}" (source: ${source})`,
			);
		}
	}

	/**
	 * Gets the current session topic
	 */
	getCurrentTopic(): string | null {
		return this.currentTopic;
	}

	/**
	 * Generates conversation starters based on current topic
	 * Implements Requirement 5.5
	 */
	generateTopicBasedStarters(count: number = 3): Comment[] {
		return this.conversationStarter.generateStarterOptions(
			this.currentTopic || undefined,
			count,
		);
	}

	/**
	 * Influences comment generation context based on current topic
	 * Implements Requirement 5.5
	 */
	influenceCommentContext(
		baseContext: ConversationContext,
	): ConversationContext {
		if (!this.config.influenceCommentGeneration) {
			return baseContext;
		}

		const influencedContext: ConversationContext = {
			...baseContext,
			currentTopic: this.currentTopic || baseContext.currentTopic || "general",
		};

		// Add topic-specific context enhancements
		if (this.currentTopic) {
			// Enhance emotion detection based on topic
			influencedContext.detectedEmotion = this.enhanceEmotionForTopic(
				baseContext.detectedEmotion || "neutral",
				this.currentTopic,
			);

			// Add topic progression context
			const currentProgression = this.getCurrentTopicProgression();
			if (currentProgression) {
				// Adjust context based on how long we've been on this topic
				const topicDuration =
					Date.now() - currentProgression.startTime.getTime();
				if (topicDuration > 300000) {
					// 5 minutes
					influencedContext.detectedEmotion = "familiarity";
				}
			}
		}

		return influencedContext;
	}

	/**
	 * Detects topic changes from user speech
	 * Implements auto-detection feature
	 */
	detectTopicFromSpeech(transcript: string): string | null {
		if (!this.config.enableAutoDetection) {
			return null;
		}

		// Simple keyword-based topic detection
		const topicKeywords: Record<string, string[]> = {
			食べ物: ["食べ", "料理", "ご飯", "美味しい", "レストラン", "グルメ"],
			アニメ: ["アニメ", "漫画", "キャラクター", "声優", "作画"],
			ゲーム: ["ゲーム", "プレイ", "レベル", "ボス", "クリア"],
			仕事: ["仕事", "会社", "プロジェクト", "会議", "上司", "同僚"],
			音楽: ["音楽", "歌", "アーティスト", "ライブ", "コンサート"],
			映画: ["映画", "監督", "俳優", "映画館", "ドラマ"],
			旅行: ["旅行", "観光", "ホテル", "飛行機", "電車", "海外"],
			健康: ["健康", "運動", "ジム", "ダイエット", "病院", "医者"],
		};

		const lowerTranscript = transcript.toLowerCase();

		for (const [topic, keywords] of Object.entries(topicKeywords)) {
			const matchCount = keywords.filter((keyword) =>
				lowerTranscript.includes(keyword.toLowerCase()),
			).length;

			// If multiple keywords match, suggest this topic
			if (matchCount >= 2) {
				return topic;
			}
		}

		return null;
	}

	/**
	 * Suggests topic changes based on conversation content
	 * Implements Requirement 5.5
	 */
	suggestTopicChange(transcript: string): string | null {
		if (!this.config.suggestTopicChanges) {
			return null;
		}

		const detectedTopic = this.detectTopicFromSpeech(transcript);

		// Only suggest if detected topic is different from current
		if (detectedTopic && detectedTopic !== this.currentTopic) {
			return detectedTopic;
		}

		return null;
	}

	/**
	 * Processes user speech for topic management
	 */
	processSpeechInput(transcript: string): void {
		// Update current topic progression
		if (this.currentTopic && this.config.trackTopicProgression) {
			const currentProgression = this.getCurrentTopicProgression();
			if (currentProgression) {
				currentProgression.commentCount++;
				// Simple engagement scoring based on speech length and frequency
				currentProgression.userEngagement += Math.min(
					transcript.length / 100,
					2,
				);
			}
		}

		// Check for topic change suggestions
		const suggestedTopic = this.suggestTopicChange(transcript);
		if (suggestedTopic) {
			console.log(`Suggested topic change to: ${suggestedTopic}`);
			// In a real implementation, this could trigger a UI notification
		}
	}

	/**
	 * Gets topic change history
	 */
	getTopicHistory(): TopicChangeEvent[] {
		return [...this.topicHistory];
	}

	/**
	 * Gets topic progression data
	 */
	getTopicProgression(): TopicProgression[] {
		return [...this.topicProgression];
	}

	/**
	 * Gets current topic progression
	 */
	private getCurrentTopicProgression(): TopicProgression | null {
		return this.topicProgression.find((p) => !p.endTime) || null;
	}

	/**
	 * Starts tracking a new topic progression
	 */
	private startNewTopicProgression(topic: string): void {
		const progression: TopicProgression = {
			topic,
			startTime: new Date(),
			commentCount: 0,
			userEngagement: 0,
		};

		this.topicProgression.push(progression);
	}

	/**
	 * Ends the current topic progression
	 */
	private endCurrentTopicProgression(): void {
		const currentProgression = this.getCurrentTopicProgression();
		if (currentProgression) {
			currentProgression.endTime = new Date();
			currentProgression.duration =
				currentProgression.endTime.getTime() -
				currentProgression.startTime.getTime();
		}
	}

	/**
	 * Enhances emotion detection based on topic context
	 */
	private enhanceEmotionForTopic(baseEmotion: string, topic: string): string {
		const topicEmotionMappings: Record<string, string> = {
			食べ物: "satisfaction",
			アニメ: "excitement",
			ゲーム: "engagement",
			仕事: "focus",
			音楽: "enjoyment",
			映画: "entertainment",
			旅行: "adventure",
			健康: "concern",
		};

		return topicEmotionMappings[topic] || baseEmotion;
	}

	/**
	 * Adds a listener for topic change events
	 */
	addTopicChangeListener(listener: (event: TopicChangeEvent) => void): void {
		this.listeners.push(listener);
	}

	/**
	 * Removes a topic change listener
	 */
	removeTopicChangeListener(listener: (event: TopicChangeEvent) => void): void {
		const index = this.listeners.indexOf(listener);
		if (index > -1) {
			this.listeners.splice(index, 1);
		}
	}

	/**
	 * Notifies all listeners of topic changes
	 */
	private notifyListeners(event: TopicChangeEvent): void {
		this.listeners.forEach((listener) => {
			try {
				listener(event);
			} catch (error) {
				console.error("Error in topic change listener:", error);
			}
		});
	}

	/**
	 * Updates configuration
	 */
	updateConfig(newConfig: Partial<TopicInfluenceConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Gets topic management statistics
	 */
	getStats() {
		const currentProgression = this.getCurrentTopicProgression();

		return {
			currentTopic: this.currentTopic,
			topicChangeCount: this.topicHistory.length,
			totalTopicProgressions: this.topicProgression.length,
			currentTopicDuration: currentProgression
				? Date.now() - currentProgression.startTime.getTime()
				: 0,
			averageTopicDuration: this.getAverageTopicDuration(),
			mostEngagingTopic: this.getMostEngagingTopic(),
		};
	}

	/**
	 * Calculates average topic duration
	 */
	private getAverageTopicDuration(): number {
		const completedProgressions = this.topicProgression.filter(
			(p) => p.duration,
		);
		if (completedProgressions.length === 0) return 0;

		const totalDuration = completedProgressions.reduce(
			(sum, p) => sum + (p.duration || 0),
			0,
		);
		return totalDuration / completedProgressions.length;
	}

	/**
	 * Gets the most engaging topic based on user engagement scores
	 */
	private getMostEngagingTopic(): string | null {
		if (this.topicProgression.length === 0) return null;

		const mostEngaging = this.topicProgression.reduce((max, current) =>
			current.userEngagement > max.userEngagement ? current : max,
		);

		return mostEngaging.topic;
	}

	/**
	 * Resets topic manager for new session
	 */
	reset(): void {
		// End current topic progression if exists
		if (this.currentTopic && this.config.trackTopicProgression) {
			this.endCurrentTopicProgression();
		}

		this.currentTopic = null;
		this.topicHistory = [];
		this.topicProgression = [];
		this.conversationStarter.resetForNewSession();
	}

	/**
	 * Destroys the topic manager and cleans up resources
	 */
	destroy(): void {
		this.listeners = [];
		this.reset();
	}
}
