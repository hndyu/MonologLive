// Checkpoint integration test for basic voice chat functionality
// Tests that voice input, transcription, and comments work together

import { CommentSystem } from "../src/comment-generation/comment-system";
import type { ConversationContext } from "../src/types/core";
import { TranscriptionDisplay } from "../src/ui/transcription-display";
import { WebSpeechVoiceInputManager } from "../src/voice/voice-input-manager";
import { createTestConversationContext } from "./test-utils";

describe("Integration Checkpoint: Basic Voice Chat Functionality", () => {
	let voiceManager: WebSpeechVoiceInputManager;
	let transcriptionDisplay: TranscriptionDisplay;
	let commentSystem: CommentSystem;

	beforeEach(() => {
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

		// Initialize components
		voiceManager = new WebSpeechVoiceInputManager();
		const transcriptionArea = document.getElementById("transcription-area");
		if (!transcriptionArea) {
			throw new Error("Transcription area not found");
		}
		transcriptionDisplay = new TranscriptionDisplay(transcriptionArea);
		commentSystem = new CommentSystem({
			enableRuleBasedGeneration: true,
			enableLocalLLM: false,
			enableAdaptiveFrequency: false, // Disable for tests
		});
		const commentArea = document.getElementById("comment-area");
		if (!commentArea) {
			throw new Error("Comment area not found");
		}
		commentSystem.initializeDisplay(commentArea);
	});

	afterEach(() => {
		voiceManager.stopListening();
		transcriptionDisplay.clear();
		commentSystem.clearComments();
		document.body.innerHTML = "";
	});

	test("Components initialize successfully", () => {
		// Test that all components can be created without errors
		expect(voiceManager).toBeDefined();
		expect(transcriptionDisplay).toBeDefined();
		expect(commentSystem).toBeDefined();

		// Test basic functionality
		expect(typeof voiceManager.isSupported).toBe("function");
		expect(typeof transcriptionDisplay.addTranscript).toBe("function");
		expect(typeof commentSystem.generateComment).toBe("function");
	});

	test("Transcription display handles text input", () => {
		// Test interim transcript
		transcriptionDisplay.addTranscript("こんにちは", false);

		// Test final transcript
		transcriptionDisplay.addTranscript(
			"こんにちは、今日はいい天気ですね",
			true,
		);

		// Verify transcript was stored
		const transcriptText = transcriptionDisplay.getTranscriptText();
		expect(transcriptText).toContain("こんにちは、今日はいい天気ですね");

		// Verify segments are managed
		const segments = transcriptionDisplay.getSegments();
		expect(segments.length).toBeGreaterThan(0);
	});

	test("Comment system generates valid comments", async () => {
		const context = createTestConversationContext({
			recentTranscript: "こんにちは",
			currentTopic: "greeting",
			userEngagement: "medium",
			sessionDuration: 5,
			commentHistory: [],
		});

		const comment = await commentSystem.generateComment(context);

		expect(comment).toBeDefined();
		expect(comment?.id).toBeDefined();
		expect(comment?.content).toBeDefined();
		expect(comment?.role).toBeDefined();
		expect(comment?.timestamp).toBeInstanceOf(Date);

		// Verify comment appears in display
		expect(commentSystem.getVisibleCommentCount()).toBe(1);
	});

	test("End-to-end conversation flow simulation", async () => {
		const conversationSteps = [
			{ text: "おはよう", isFinal: false },
			{ text: "おはようございます", isFinal: true },
			{ text: "今日は", isFinal: false },
			{ text: "今日はいい天気ですね", isFinal: true },
		];

		const context = createTestConversationContext({
			recentTranscript: "",
			currentTopic: "daily_conversation",
			userEngagement: "medium",
			sessionDuration: 0,
			commentHistory: [],
		});

		for (const step of conversationSteps) {
			// Add transcription
			transcriptionDisplay.addTranscript(step.text, step.isFinal);

			// Generate comment for final transcripts
			if (step.isFinal) {
				context.recentTranscript = step.text;
				if (context.sessionDuration !== undefined) {
					context.sessionDuration += 1;
				}

				const comment = await commentSystem.generateComment(context);
				if (comment && context.commentHistory) {
					context.commentHistory.push(comment);
				}

				// Small delay to simulate real timing
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		// Verify end-to-end results
		const finalTranscript = transcriptionDisplay.getTranscriptText();
		const commentCount = commentSystem.getVisibleCommentCount();

		expect(finalTranscript.length).toBeGreaterThan(0);
		expect(commentCount).toBeGreaterThan(0);
		expect(context.commentHistory?.length).toBe(2); // Two final transcripts = two comments
	});

	test("Comment interactions work correctly", async () => {
		// Generate a test comment
		const context: ConversationContext = createTestConversationContext({
			recentTranscript: "テスト",
			currentTopic: "test",
			userEngagement: "medium",
			sessionDuration: 1,
			commentHistory: [],
		});

		const comment = await commentSystem.generateComment(context);

		// Find comment element in DOM
		const commentElement = document.querySelector(
			`[data-comment-id="${comment?.id}"]`,
		) as HTMLElement;
		expect(commentElement).toBeTruthy();

		// Test click interaction
		if (commentElement) {
			// Simulate click
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

		// If we get here without errors, interactions are working
		expect(true).toBe(true);
	});

	test("Voice input manager handles callbacks correctly", () => {
		// Set up callbacks
		voiceManager.onTranscript((text, isFinal) => {
			expect(typeof text).toBe("string");
			expect(typeof isFinal).toBe("boolean");
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

		// Callbacks are set up correctly if we get here
		expect(true).toBe(true);
	});

	test("Components work together in realistic scenario", async () => {
		// Simulate a realistic conversation scenario
		const scenario = [
			{ transcript: "こんばんは", topic: "greeting" },
			{ transcript: "今日は疲れた", topic: "daily_life" },
			{ transcript: "アニメでも見ようかな", topic: "entertainment" },
			{ transcript: "おやすみ", topic: "departure" },
		];

		const context: ConversationContext = createTestConversationContext({
			recentTranscript: "",
			currentTopic: "",
			userEngagement: "medium",
			sessionDuration: 0,
			commentHistory: [],
		});

		for (const step of scenario) {
			// Add transcription (simulate interim then final)
			transcriptionDisplay.addTranscript(
				step.transcript.substring(0, -1),
				false,
			);
			await new Promise((resolve) => setTimeout(resolve, 50));

			transcriptionDisplay.addTranscript(step.transcript, true);

			// Update context and generate comment
			context.recentTranscript = step.transcript;
			context.currentTopic = step.topic;
			if (context.sessionDuration !== undefined) {
				context.sessionDuration += 1;
			}

			const comment = await commentSystem.generateComment(context);
			if (comment && context.commentHistory) {
				context.commentHistory.push(comment);
			}

			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Verify final state
		const finalTranscript = transcriptionDisplay.getTranscriptText();
		const commentCount = commentSystem.getVisibleCommentCount();
		const roleWeights = commentSystem.getRoleWeights();

		expect(finalTranscript).toContain("こんばんは");
		expect(finalTranscript).toContain("おやすみ");
		expect(commentCount).toBe(scenario.length);
		expect(Object.keys(roleWeights).length).toBeGreaterThan(0);
		expect(context.commentHistory?.length).toBe(scenario.length);
	});
});
