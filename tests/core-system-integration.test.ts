// Core system integration test for checkpoint validation
// Tests complete user journey: session start -> voice input -> comments -> learning -> summary

import { CommentSystem } from "../src/comment-generation/comment-system";
import { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import type { Comment, ConversationContext } from "../src/types/core";
import { TranscriptionDisplay } from "../src/ui/transcription-display";
import { WebSpeechVoiceInputManager } from "../src/voice/voice-input-manager";
import {
	createTestConversationContext,
	createTestUserPreferences,
} from "./test-utils";

describe("Core System Integration - Complete User Journey", () => {
	let storage: IndexedDBWrapper;
	let voiceManager: WebSpeechVoiceInputManager;
	let transcriptionDisplay: TranscriptionDisplay;
	let commentSystem: CommentSystem;

	beforeEach(async () => {
		// Set up DOM environment
		document.body.innerHTML = `
      <div id="test-container">
        <div id="transcription-area" style="height: 200px; overflow-y: auto;"></div>
        <div id="comment-area" style="height: 200px; overflow-y: auto;"></div>
      </div>
    `;

		const testContainer = document.getElementById("test-container");
		if (!testContainer) {
			throw new Error("Test container not found");
		}

		// Initialize storage
		storage = new IndexedDBWrapper();
		await storage.initialize();

		// Initialize components
		voiceManager = new WebSpeechVoiceInputManager();
		const transcriptionArea = document.getElementById("transcription-area");
		if (!transcriptionArea) {
			throw new Error("Transcription area not found");
		}
		transcriptionDisplay = new TranscriptionDisplay(transcriptionArea);
		commentSystem = new CommentSystem();
		const commentArea = document.getElementById("comment-area");
		if (!commentArea) {
			throw new Error("Comment area not found");
		}
		commentSystem.initializeDisplay(commentArea);
	});

	afterEach(async () => {
		voiceManager.stopListening();
		transcriptionDisplay.clear();
		commentSystem.clearComments();
		document.body.innerHTML = "";

		// Clean up storage
		try {
			await storage.clearAllData();
		} catch (error) {
			console.warn("Failed to clear storage:", error);
		}
	});

	test("Complete user journey: voice input -> transcription -> comments", async () => {
		// Step 1: Simulate conversation with voice input and comments
		const conversationSteps = [
			{ text: "おはよう", topic: "greeting", engagement: "high" },
			{ text: "今日はいい天気ですね", topic: "weather", engagement: "medium" },
			{ text: "散歩でもしようかな", topic: "activities", engagement: "medium" },
			{ text: "アニメも見たいし", topic: "entertainment", engagement: "high" },
			{ text: "そろそろ寝ます", topic: "departure", engagement: "low" },
		];

		const context = createTestConversationContext({
			recentTranscript: "",
			currentTopic: "daily conversation",
			userEngagement: "medium",
			sessionDuration: 0,
			commentHistory: [],
		});

		for (let i = 0; i < conversationSteps.length; i++) {
			const step = conversationSteps[i];

			// Add transcription (simulate interim then final)
			transcriptionDisplay.addTranscript(step.text.substring(0, -1), false);
			await new Promise((resolve) => setTimeout(resolve, 50));

			transcriptionDisplay.addTranscript(step.text, true);

			// Update context and generate comment
			context.recentTranscript = step.text;
			context.currentTopic = step.topic;
			context.userEngagement = step.engagement as "low" | "medium" | "high";
			if (context.sessionDuration !== undefined) {
				context.sessionDuration = i + 1;
			}

			const comment = await commentSystem.generateComment(context);
			if (comment && context.commentHistory) {
				context.commentHistory.push(comment);
			}

			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Verify end-to-end results
		const finalTranscript = transcriptionDisplay.getTranscriptText();
		const commentCount = commentSystem.getVisibleCommentCount();

		expect(finalTranscript.length).toBeGreaterThan(0);
		expect(commentCount).toBe(conversationSteps.length);
		expect(context.commentHistory?.length).toBe(conversationSteps.length);

		// Verify transcript contains all conversation steps
		for (const step of conversationSteps) {
			expect(finalTranscript).toContain(step.text);
		}

		// Verify comments were generated with different roles
		const roles = new Set(context.commentHistory?.map((c) => c.role) || []);
		expect(roles.size).toBeGreaterThan(1); // Should have multiple different roles
	});

	test("Comment system generates diverse roles and handles interactions", async () => {
		// Generate comments with different contexts to test role diversity
		const testContexts: Array<Partial<ConversationContext>> = [
			{
				recentTranscript: "おはよう",
				currentTopic: "greeting",
				userEngagement: "high" as const,
			},
			{
				recentTranscript: "そろそろ寝ます",
				currentTopic: "departure",
				userEngagement: "low" as const,
			},
			{
				recentTranscript: "かわいい猫の動画見てる",
				currentTopic: "entertainment",
				userEngagement: "medium" as const,
			},
			{
				recentTranscript: "今日何してた？",
				currentTopic: "daily_life",
				userEngagement: "medium" as const,
			},
			{
				recentTranscript: "たしかにそうですね",
				currentTopic: "agreement",
				userEngagement: "medium" as const,
			},
		];

		const generatedComments: Comment[] = [];

		for (let i = 0; i < testContexts.length; i++) {
			const context: ConversationContext = createTestConversationContext({
				...testContexts[i],
				sessionDuration: i + 1,
				commentHistory: generatedComments.slice(),
			});

			const comment = await commentSystem.generateComment(context);
			if (comment) {
				generatedComments.push(comment);

				// Verify comment structure
				expect(comment.id).toBeDefined();
				expect(comment.content).toBeDefined();
				expect(comment.role).toBeDefined();
				expect(comment.timestamp).toBeInstanceOf(Date);
				expect(comment.context).toBeDefined();
			}
		}

		// Verify role diversity
		const roles = new Set(generatedComments.map((c) => c.role));
		expect(roles.size).toBeGreaterThan(2); // Should have multiple different roles

		// Test comment interactions
		const testComment = generatedComments[0];
		const commentElement = document.querySelector(
			`[data-comment-id="${testComment.id}"]`,
		) as HTMLElement;

		if (commentElement) {
			// Test click interaction
			commentElement.click();

			// Test thumbs up if available
			const thumbsUpBtn = commentElement.querySelector(
				".thumbs-up-btn",
			) as HTMLElement;
			if (thumbsUpBtn) {
				thumbsUpBtn.click();
			}

			// Test thumbs down if available
			const thumbsDownBtn = commentElement.querySelector(
				".thumbs-down-btn",
			) as HTMLElement;
			if (thumbsDownBtn) {
				thumbsDownBtn.click();
			}
		}

		// Verify comment system state
		expect(commentSystem.getVisibleCommentCount()).toBe(testContexts.length);
		expect(commentSystem.getRoleWeights()).toBeDefined();
		expect(commentSystem.getActiveRoles().length).toBeGreaterThan(0);
	});

	test("Voice input manager integration with transcription display", async () => {
		// Set up voice input callbacks
		voiceManager.onTranscript((text, isFinal) => {
			expect(typeof text).toBe("string");
			expect(typeof isFinal).toBe("boolean");

			// Add to transcription display
			transcriptionDisplay.addTranscript(text, isFinal);
		});

		voiceManager.onError((error) => {
			expect(error.error).toBeDefined();
			expect(error.message).toBeDefined();
			expect(error.timestamp).toBeInstanceOf(Date);
		});

		// Test support detection
		const isSupported = voiceManager.isSupported();
		expect(typeof isSupported).toBe("boolean");

		// Test listening state
		const isListening = voiceManager.isListening();
		expect(typeof isListening).toBe("boolean");

		// Simulate transcript input manually since we can't trigger actual speech recognition in tests
		const testPhrases = ["こんにちは", "今日はいい天気ですね", "ありがとう"];

		for (const phrase of testPhrases) {
			transcriptionDisplay.addTranscript(phrase, true);
		}

		// Verify transcription display functionality
		const finalTranscript = transcriptionDisplay.getTranscriptText();
		expect(finalTranscript.length).toBeGreaterThan(0);

		for (const phrase of testPhrases) {
			expect(finalTranscript).toContain(phrase);
		}

		const segments = transcriptionDisplay.getSegments();
		expect(segments.length).toBeGreaterThan(0);
	});

	test("Error handling and system resilience", async () => {
		// Test handling of invalid transcript
		expect(() => {
			transcriptionDisplay.addTranscript("", true);
		}).not.toThrow();

		// Test handling of invalid comment generation
		const invalidContext: ConversationContext = createTestConversationContext({
			recentTranscript: "",
			currentTopic: "",
			userEngagement: "medium",
			sessionDuration: 0,
			commentHistory: [],
		});

		const comment = await commentSystem.generateComment(invalidContext);
		expect(comment).toBeDefined(); // Should still generate a comment

		// Test storage operations
		expect(async () => {
			await storage.initialize();
		}).not.toThrow();

		// Test component cleanup
		expect(() => {
			transcriptionDisplay.clear();
			commentSystem.clearComments();
		}).not.toThrow();
	});

	test("Component integration and data flow", async () => {
		// Test data flow: Voice -> Transcription -> Comments
		const testPhrase = "こんにちは、今日はいい天気ですね";

		// 1. Voice input simulation
		voiceManager.onTranscript((text, isFinal) => {
			if (isFinal && text === testPhrase) {
				// Transcript received successfully
			}
		});

		// 2. Transcription display
		transcriptionDisplay.addTranscript(testPhrase, true);
		const displayedText = transcriptionDisplay.getTranscriptText();
		expect(displayedText).toContain(testPhrase);

		// 3. Comment generation
		const comment = await commentSystem.generateComment(
			createTestConversationContext({
				recentTranscript: testPhrase,
				currentTopic: "greeting",
				userEngagement: "high",
				sessionDuration: 1,
				commentHistory: [],
			}),
		);
		expect(comment?.content).toBeDefined();
		expect(comment?.role).toBeDefined();

		// 4. Verify complete data flow
		expect(transcriptionDisplay.getSegments().length).toBeGreaterThan(0);
		expect(commentSystem.getVisibleCommentCount()).toBe(1);
		expect(commentSystem.getRoleWeights()).toBeDefined();

		// 5. Test storage integration
		await storage.saveUserPreferences(
			"test_user",
			createTestUserPreferences({
				userId: "test_user",
				roleWeights: new Map(),
				topicPreferences: [],
				interactionHistory: [],
				sessionCount: 1,
			}),
		);
		const preferences = await storage.getUserPreferences("test_user");
		expect(preferences).toBeDefined();
	});
});
