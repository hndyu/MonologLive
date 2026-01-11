// Conversation starter system for session initialization
// Implements Requirements 5.2, 5.3, 5.4

import type { Comment } from "../types/core";

/**
 * Topic-based conversation starter patterns
 * Implements Requirement 5.3 with specific examples
 */
export const CONVERSATION_STARTERS: Record<string, string[]> = {
	// General conversation starters (no specific topic)
	general: [
		"もうご飯食べた？",
		"最近ハマってるものある？",
		"今期どのアニメ見てる？",
		"今日はどんな一日だった？",
		"何か面白いことあった？",
		"最近どう？",
		"今日お疲れ様！",
		"何してたの？",
		"調子はどう？",
		"今日は何曜日だっけ？",
	],

	// Food-related starters
	food: [
		"もうご飯食べた？",
		"今日何食べた？",
		"最近美味しいもの食べた？",
		"お腹すいてない？",
		"好きな料理は何？",
		"今度何食べたい？",
		"コンビニで何買う？",
		"朝ごはん食べた？",
	],

	// Entertainment starters
	entertainment: [
		"今期どのアニメ見てる？",
		"最近面白い映画見た？",
		"ゲームやってる？",
		"音楽何聞いてる？",
		"本読んでる？",
		"YouTubeで何見てる？",
		"最近ハマってるものある？",
	],

	// Daily life starters
	daily: [
		"今日はどんな一日だった？",
		"お疲れ様！",
		"今日何してた？",
		"明日の予定は？",
		"最近忙しい？",
		"調子はどう？",
		"何か変わったことあった？",
	],

	// Work/study starters
	work: [
		"お仕事お疲れ様！",
		"今日は忙しかった？",
		"勉強してる？",
		"最近どう？仕事は？",
		"プロジェクトの調子は？",
		"今日は何時まで？",
	],

	// Weather/season starters
	weather: [
		"今日は暖かいね",
		"寒くない？",
		"雨降ってる？",
		"今日の天気どう？",
		"季節の変わり目だね",
		"桜咲いてる？",
		"夏っぽくなってきた",
	],

	// Weekend/holiday starters
	weekend: [
		"今日は休み？",
		"週末何してた？",
		"連休どうだった？",
		"今度の休みは何する？",
		"ゆっくりできた？",
		"どこか行った？",
	],
};

/**
 * Greeting patterns for session start
 * Implements Requirement 5.2
 */
export const SESSION_GREETINGS: string[] = [
	"こんばんは！",
	"おはよう〜",
	"こんにちは！",
	"お疲れ様です！",
	"きたー！",
	"はじめまして",
	"よろしくお願いします",
	"こんばんわ〜",
	"お疲れ様！",
	"いらっしゃい〜",
];

/**
 * Time-based greeting selection
 */
export function getTimeBasedGreeting(): string {
	const hour = new Date().getHours();

	if (hour >= 5 && hour < 10) {
		return "おはよう〜";
	} else if (hour >= 10 && hour < 17) {
		return "こんにちは！";
	} else if (hour >= 17 && hour < 22) {
		return "こんばんは！";
	} else {
		return "お疲れ様です！";
	}
}

/**
 * Conversation starter generator
 * Implements Requirements 5.2, 5.3, 5.4
 */
export class ConversationStarterGenerator {
	private usedStarters: Set<string> = new Set();
	private sessionStartTime: Date;

	constructor() {
		this.sessionStartTime = new Date();
	}

	/**
	 * Generates session opening greeting
	 * Implements Requirement 5.2
	 */
	generateSessionGreeting(): Comment {
		const greeting = getTimeBasedGreeting();

		return {
			id: `greeting_${Date.now()}`,
			role: "greeting",
			content: greeting,
			timestamp: new Date(),
			context: {
				recentTranscript: "",
				currentTopic: "session_start",
				userEngagementLevel: 0.5,
				speechVolume: 0,
				speechRate: 1.0,
				silenceDuration: 0,
				detectedEmotion: "neutral",
			},
		};
	}

	/**
	 * Generates conversation starter based on topic
	 * Implements Requirements 5.3, 5.4
	 */
	generateConversationStarter(topic?: string): Comment {
		let starters: string[];
		let selectedTopic = "general";

		// Select appropriate starter category based on topic
		if (topic) {
			selectedTopic = this.mapTopicToCategory(topic.toLowerCase());
			starters =
				CONVERSATION_STARTERS[selectedTopic] || CONVERSATION_STARTERS.general;
		} else {
			// No topic specified, use general starters
			starters = CONVERSATION_STARTERS.general;
		}

		// Select starter that hasn't been used recently
		const availableStarters = starters.filter(
			(starter) => !this.usedStarters.has(starter),
		);

		// If all starters have been used, reset the used set
		if (availableStarters.length === 0) {
			this.usedStarters.clear();
			availableStarters.push(...starters);
		}

		// Randomly select from available starters
		const selectedStarter =
			availableStarters[Math.floor(Math.random() * availableStarters.length)];
		this.usedStarters.add(selectedStarter);

		// Clean up old used starters (keep only last 5)
		if (this.usedStarters.size > 5) {
			const oldestStarter = Array.from(this.usedStarters)[0];
			this.usedStarters.delete(oldestStarter);
		}

		return {
			id: `starter_${Date.now()}`,
			role: "question",
			content: selectedStarter,
			timestamp: new Date(),
			context: {
				recentTranscript: "",
				currentTopic: topic || "general",
				userEngagementLevel: 0.5,
				speechVolume: 0,
				speechRate: 1.0,
				silenceDuration: 0,
				detectedEmotion: "curiosity",
			},
		};
	}

	/**
	 * Maps user topic input to starter categories
	 */
	private mapTopicToCategory(topic: string): string {
		const topicMappings: Record<string, string> = {
			// Food related
			食べ物: "food",
			料理: "food",
			ご飯: "food",
			食事: "food",
			グルメ: "food",

			// Entertainment
			アニメ: "entertainment",
			映画: "entertainment",
			ゲーム: "entertainment",
			音楽: "entertainment",
			本: "entertainment",
			読書: "entertainment",

			// Work/study
			仕事: "work",
			勉強: "work",
			学校: "work",
			会社: "work",
			プロジェクト: "work",

			// Daily life
			日常: "daily",
			生活: "daily",
			今日: "daily",
			一日: "daily",

			// Weather
			天気: "weather",
			気候: "weather",
			季節: "weather",

			// Weekend
			休み: "weekend",
			週末: "weekend",
			連休: "weekend",
			休日: "weekend",
		};

		// Check for exact matches first
		if (topicMappings[topic]) {
			return topicMappings[topic];
		}

		// Check for partial matches
		for (const [key, category] of Object.entries(topicMappings)) {
			if (topic.includes(key) || key.includes(topic)) {
				return category;
			}
		}

		return "general";
	}

	/**
	 * Generates multiple starter options for variety
	 * Implements Requirement 5.4 (variety in opening comments)
	 */
	generateStarterOptions(topic?: string, count: number = 3): Comment[] {
		const starters: Comment[] = [];

		// Always include a greeting first
		starters.push(this.generateSessionGreeting());

		// Generate additional conversation starters
		for (let i = 1; i < count; i++) {
			starters.push(this.generateConversationStarter(topic));
		}

		return starters;
	}

	/**
	 * Generates follow-up starter if initial conversation doesn't start
	 */
	generateFollowUpStarter(silenceDuration: number): Comment | null {
		// Only generate follow-up after significant silence
		if (silenceDuration < 15000) {
			// 15 seconds
			return null;
		}

		const followUpStarters = [
			"何か話したいことある？",
			"どうしたの？",
			"大丈夫？",
			"何考えてる？",
			"今日はどんな気分？",
			"何かあった？",
		];

		const selectedStarter =
			followUpStarters[Math.floor(Math.random() * followUpStarters.length)];

		return {
			id: `followup_${Date.now()}`,
			role: "question",
			content: selectedStarter,
			timestamp: new Date(),
			context: {
				recentTranscript: "",
				currentTopic: "follow_up",
				userEngagementLevel: 0.3,
				speechVolume: 0,
				speechRate: 1.0,
				silenceDuration,
				detectedEmotion: "concern",
			},
		};
	}

	/**
	 * Resets the used starters for a new session
	 */
	resetForNewSession(): void {
		this.usedStarters.clear();
		this.sessionStartTime = new Date();
	}

	/**
	 * Gets statistics about starter usage
	 */
	getStats() {
		return {
			usedStartersCount: this.usedStarters.size,
			sessionStartTime: this.sessionStartTime,
			availableCategories: Object.keys(CONVERSATION_STARTERS),
		};
	}
}
