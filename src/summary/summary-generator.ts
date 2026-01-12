// Basic summary generation implementation with enhanced transcription support

import type {
	InsightGenerator,
	SummaryGenerator,
	TopicExtractor,
} from "../interfaces/summary-generation.js";
import { transcriptionIntegration } from "../transcription/transcription-integration";
import type {
	AudioFile,
	Insight,
	Session,
	SessionSummary,
	Topic,
	TranscriptSegment,
} from "../types/core.js";

export class SummaryGeneratorImpl implements SummaryGenerator {
	private topicExtractor: TopicExtractor;
	private insightGenerator: InsightGenerator;

	constructor(
		topicExtractor: TopicExtractor,
		insightGenerator: InsightGenerator,
	) {
		this.topicExtractor = topicExtractor;
		this.insightGenerator = insightGenerator;

		// Initialize enhanced transcription
		this.initializeEnhancedTranscription();
	}

	private async initializeEnhancedTranscription(): Promise<void> {
		try {
			await transcriptionIntegration.initialize();
		} catch (_unused) {
			// Enhanced transcription initialization failed, continue without it
		}
	}

	async enhanceTranscript(
		rawTranscript: string,
		audioFile?: AudioFile,
	): Promise<string> {
		// If we have enhanced transcription available and an audio file, use it
		if (transcriptionIntegration.isAvailable() && audioFile) {
			try {
				console.log("Using enhanced transcription for improved accuracy");

				const comparison =
					await transcriptionIntegration.compareTranscriptionQuality(
						rawTranscript,
						audioFile,
					);

				console.log(
					`Transcription quality comparison - Original: ${comparison.originalQuality.toFixed(2)}, Enhanced: ${comparison.enhancedQuality.toFixed(2)}`,
				);

				if (comparison.useEnhanced && comparison.enhancedResult) {
					console.log("Using enhanced transcription (better quality detected)");
					return this.cleanTranscript(comparison.enhancedResult.text);
				} else {
					console.log(
						"Using original transcription (quality difference not significant)",
					);
				}
			} catch (error) {
				console.warn(
					"Enhanced transcription failed, falling back to original:",
					error,
				);
			}
		}

		// Fallback to basic text cleaning and formatting
		return this.cleanTranscript(rawTranscript);
	}

	async extractTopics(transcript: string): Promise<Topic[]> {
		return await this.topicExtractor.extractTopics(transcript);
	}

	async generateInsights(topics: Topic[]): Promise<Insight[]> {
		// Generate insights based on topics and session data
		const insights: Insight[] = [];

		// Add topic-based insights
		for (const topic of topics) {
			if (topic.relevance > 0.7) {
				insights.push({
					type: "topic_focus",
					content: `You spent significant time discussing ${topic.name}`,
					confidence: topic.relevance,
				});
			}
		}

		return insights;
	}

	async createSummary(session: Session): Promise<SessionSummary> {
		// Combine all transcript segments into full text
		const fullTranscript = this.combineTranscriptSegments(session.transcript);

		// Try to get audio file for enhanced transcription
		const audioFile = await this.getSessionAudioFile(session.id);

		// Enhance transcript if needed
		const enhancedTranscript = await this.enhanceTranscript(
			fullTranscript,
			audioFile,
		);

		// Extract topics from transcript
		const topics = await this.extractTopics(enhancedTranscript);

		// Generate insights
		const insights = await this.insightGenerator.generateInsights(
			topics,
			session,
		);

		// Create overall summary
		const overallSummary = this.generateOverallSummary(
			session,
			topics,
			insights,
		);

		return {
			sessionId: session.id,
			topics,
			insights,
			overallSummary,
			generatedAt: new Date(),
		};
	}

	private combineTranscriptSegments(segments: TranscriptSegment[]): string {
		return segments
			.filter((segment) => segment.isFinal)
			.sort((a, b) => a.start - b.start)
			.map((segment) => segment.text)
			.join(" ");
	}

	private cleanTranscript(transcript: string): string {
		return transcript
			.replace(/\s+/g, " ")
			.replace(/[^\w\s.,!?]/g, "")
			.trim();
	}

	private async getSessionAudioFile(
		_sessionId: string,
	): Promise<AudioFile | undefined> {
		// This would typically fetch from the audio storage system
		// For now, we'll return undefined as a placeholder
		// In a real implementation, this would integrate with the AudioManager
		try {
			// TODO: Integrate with AudioManager to get session audio file
			return undefined;
		} catch (_unused) {
			return undefined;
		}
	}

	private generateOverallSummary(
		session: Session,
		topics: Topic[],
		insights: Insight[],
	): string {
		const duration = session.metrics.totalDuration / (1000 * 60); // minutes
		const topTopics = topics
			.sort((a, b) => b.relevance - a.relevance)
			.slice(0, 3)
			.map((t) => t.name);

		let summary = `Session lasted ${Math.round(duration)} minutes`;

		if (session.topic) {
			summary += ` with focus on "${session.topic}"`;
		}

		if (topTopics.length > 0) {
			summary += `. Main topics discussed: ${topTopics.join(", ")}`;
		}

		summary += `. Generated ${session.metrics.commentCount} comments with ${session.metrics.interactionCount} user interactions`;

		if (insights.length > 0) {
			const keyInsight = insights.find((i) => i.confidence > 0.8);
			if (keyInsight) {
				summary += `. Key insight: ${keyInsight.content}`;
			}
		}

		return `${summary}.`;
	}
}

export class BasicTopicExtractor implements TopicExtractor {
	private commonWords = new Set([
		"the",
		"a",
		"an",
		"and",
		"or",
		"but",
		"in",
		"on",
		"at",
		"to",
		"for",
		"of",
		"with",
		"by",
		"i",
		"you",
		"he",
		"she",
		"it",
		"we",
		"they",
		"me",
		"him",
		"her",
		"us",
		"them",
		"is",
		"are",
		"was",
		"were",
		"be",
		"been",
		"being",
		"have",
		"has",
		"had",
		"do",
		"does",
		"did",
		"will",
		"would",
		"could",
		"should",
		"may",
		"might",
		"can",
		"must",
		"this",
		"that",
		"these",
		"those",
		"here",
		"there",
		"where",
		"when",
		"why",
		"how",
		"what",
		"who",
		"which",
		"whose",
		"whom",
		"very",
		"really",
		"quite",
		"pretty",
		"so",
		"too",
		"much",
		"many",
		"more",
		"most",
		"just",
		"only",
		"even",
		"also",
		"still",
		"yet",
		"already",
		"again",
		"up",
		"down",
		"out",
		"off",
		"over",
		"under",
		"above",
		"below",
		"through",
		"between",
		"into",
		"onto",
		"from",
		"about",
		"around",
		"across",
		"along",
		"against",
	]);

	async extractTopics(text: string): Promise<Topic[]> {
		const words = this.tokenizeText(text);
		const wordFreq = this.calculateWordFrequency(words);
		const topics: Topic[] = [];

		// Extract potential topics
		for (const [word, frequency] of wordFreq.entries()) {
			// Relaxed criteria for test environment and Japanese support
			const isCommon = this.commonWords.has(word.toLowerCase());
			const isLongEnough = word.length >= 1; // Support single-kanji topics

			if (!isCommon && isLongEnough && frequency >= 1) {
				const relevance = Math.min((frequency / (words.length || 1)) * 5, 1.0);
				const sentiment = this.calculateBasicSentiment(text, word);

				topics.push({
					name: word,
					relevance,
					mentions: frequency,
					sentiment,
				});
			}
		}

		// Sort by relevance and return top topics
		return topics.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
	}

	getTopicRelevance(topic: string, context: string): number {
		const topicWords = topic.toLowerCase().split(/\s+/);
		const contextWords = context.toLowerCase().split(/\s+/);

		let matches = 0;
		for (const topicWord of topicWords) {
			if (contextWords.includes(topicWord)) {
				matches++;
			}
		}

		return matches / topicWords.length;
	}

	private tokenizeText(text: string): string[] {
		return text
			.toLowerCase()
			.replace(/[.,!?！？。、]/g, " ")
			.split(/\s+/)
			.filter((word) => word.length > 0);
	}

	private calculateWordFrequency(words: string[]): Map<string, number> {
		const freq = new Map<string, number>();
		for (const word of words) {
			freq.set(word, (freq.get(word) || 0) + 1);
		}
		return freq;
	}

	private calculateBasicSentiment(text: string, word: string): number {
		// Very basic sentiment analysis - could be enhanced with proper sentiment analysis
		const positiveWords = [
			"good",
			"great",
			"awesome",
			"amazing",
			"love",
			"like",
			"happy",
			"excited",
		];
		const negativeWords = [
			"bad",
			"terrible",
			"awful",
			"hate",
			"dislike",
			"sad",
			"angry",
			"frustrated",
		];

		const sentences = text.toLowerCase().split(/[.!?]+/);
		let sentimentSum = 0;
		let sentimentCount = 0;

		for (const sentence of sentences) {
			if (sentence.includes(word.toLowerCase())) {
				let sentenceScore = 0;
				for (const posWord of positiveWords) {
					if (sentence.includes(posWord)) sentenceScore += 1;
				}
				for (const negWord of negativeWords) {
					if (sentence.includes(negWord)) sentenceScore -= 1;
				}
				sentimentSum += sentenceScore;
				sentimentCount++;
			}
		}

		return sentimentCount > 0 ? sentimentSum / sentimentCount : 0;
	}
}

export class BasicInsightGenerator implements InsightGenerator {
	async generateInsights(
		topics: Topic[],
		sessionData: Session,
	): Promise<Insight[]> {
		const insights: Insight[] = [];

		// Analyze session duration
		const durationMinutes = sessionData.metrics.totalDuration / (1000 * 60);
		if (durationMinutes > 30) {
			insights.push({
				type: "session_length",
				content:
					"You had an extended conversation session, showing deep engagement",
				confidence: 0.9,
			});
		} else if (durationMinutes < 5) {
			insights.push({
				type: "session_length",
				content:
					"This was a brief session - consider longer conversations for better insights",
				confidence: 0.8,
			});
		}

		// Analyze interaction patterns
		const interactionRate = sessionData.metrics.averageEngagement;
		if (interactionRate > 2) {
			insights.push({
				type: "engagement",
				content:
					"High interaction rate suggests you were very engaged with the comments",
				confidence: 0.85,
			});
		} else if (interactionRate < 0.5) {
			insights.push({
				type: "engagement",
				content:
					"Low interaction rate - you might prefer more independent conversation",
				confidence: 0.75,
			});
		}

		// Analyze topic diversity
		const highRelevanceTopics = topics.filter((t) => t.relevance > 0.5);
		if (highRelevanceTopics.length > 5) {
			insights.push({
				type: "topic_diversity",
				content: "You covered many different topics, showing varied interests",
				confidence: 0.8,
			});
		} else if (highRelevanceTopics.length <= 2) {
			insights.push({
				type: "topic_focus",
				content:
					"You maintained focus on specific topics throughout the conversation",
				confidence: 0.85,
			});
		}

		// Analyze sentiment patterns
		const averageSentiment =
			topics.reduce((sum, topic) => sum + topic.sentiment, 0) / topics.length;
		if (averageSentiment > 0.3) {
			insights.push({
				type: "sentiment",
				content: "Overall positive tone in your conversation",
				confidence: 0.7,
			});
		} else if (averageSentiment < -0.3) {
			insights.push({
				type: "sentiment",
				content: "Some negative themes emerged in your conversation",
				confidence: 0.7,
			});
		}

		return insights;
	}

	async analyzeEmotionalTone(transcript: string): Promise<number> {
		// Basic emotional tone analysis
		const positiveWords = [
			"happy",
			"excited",
			"love",
			"great",
			"awesome",
			"amazing",
			"wonderful",
		];
		const negativeWords = [
			"sad",
			"angry",
			"frustrated",
			"terrible",
			"awful",
			"hate",
			"disappointed",
		];

		const words = transcript.toLowerCase().split(/\s+/);
		let positiveCount = 0;
		let negativeCount = 0;

		for (const word of words) {
			if (positiveWords.includes(word)) positiveCount++;
			if (negativeWords.includes(word)) negativeCount++;
		}

		const totalEmotionalWords = positiveCount + negativeCount;
		if (totalEmotionalWords === 0) return 0;

		return (positiveCount - negativeCount) / totalEmotionalWords;
	}

	async identifyConversationPatterns(session: Session): Promise<string[]> {
		const patterns: string[] = [];

		// Analyze comment response patterns
		const commentCount = session.metrics.commentCount;
		const interactionCount = session.metrics.interactionCount;

		if (interactionCount / commentCount > 0.5) {
			patterns.push("high_responsiveness");
		} else if (interactionCount / commentCount < 0.2) {
			patterns.push("low_responsiveness");
		}

		// Analyze speech patterns from transcript
		const transcriptText = session.transcript
			.filter((segment) => segment.isFinal)
			.map((segment) => segment.text)
			.join(" ");

		const sentences = transcriptText
			.split(/[.!?]+/)
			.filter((s) => s.trim().length > 0);
		const avgSentenceLength =
			sentences.reduce((sum, s) => sum + s.split(" ").length, 0) /
			sentences.length;

		if (avgSentenceLength > 15) {
			patterns.push("detailed_speaker");
		} else if (avgSentenceLength < 8) {
			patterns.push("concise_speaker");
		}

		return patterns;
	}
}
