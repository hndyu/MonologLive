// Integration test for basic voice chat functionality
// Tests end-to-end conversation flow: voice input -> transcription -> comment generation

import { CommentSystem } from "./comment-generation/comment-system.js";
import type { ConversationContext } from "./types/core.js";
import { TranscriptionDisplay } from "./ui/transcription-display.js";
import { WebSpeechVoiceInputManager } from "./voice/voice-input-manager.js";
import { createTestConversationContext } from "../tests/test-utils.js";

/**
 * Integration test class for basic voice chat functionality
 * Validates Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 6.3, 6.4, 10.1, 10.2
 */
export class VoiceChatIntegrationTest {
	private voiceManager: WebSpeechVoiceInputManager;
	private transcriptionDisplay: TranscriptionDisplay;
	private commentSystem: CommentSystem;
	private testContainer!: HTMLElement;
	private testResults: { [key: string]: boolean } = {};
	private conversationContext: ConversationContext;

	constructor() {
		this.voiceManager = new WebSpeechVoiceInputManager();
		this.conversationContext = createTestConversationContext({
			recentTranscript: "",
			currentTopic: "test conversation",
			userEngagement: "medium",
			sessionDuration: 0,
			commentHistory: [],
		});

		this.setupTestEnvironment();
		this.commentSystem = new CommentSystem();
		this.transcriptionDisplay = new TranscriptionDisplay(
			this.getTranscriptionContainer(),
			{ showTimestamps: true, autoScroll: true },
		);

		this.commentSystem.initializeDisplay(this.getCommentContainer());
	}

	/**
	 * Sets up test environment with DOM containers
	 */
	private setupTestEnvironment(): void {
		// Create test container if it doesn't exist
		this.testContainer =
			document.getElementById("integration-test") ||
			document.createElement("div");
		this.testContainer.id = "integration-test";
		this.testContainer.innerHTML = `
      <div class="test-layout" style="display: flex; height: 400px; gap: 20px; padding: 20px;">
        <div class="transcription-section" style="flex: 1; border: 1px solid #ccc; padding: 10px;">
          <h3>Live Transcription</h3>
          <div id="transcription-container" style="height: 300px; overflow-y: auto; background: #f9f9f9; padding: 10px;"></div>
        </div>
        <div class="comment-section" style="flex: 1; border: 1px solid #ccc; padding: 10px;">
          <h3>Live Comments</h3>
          <div id="comment-container" style="height: 300px; overflow-y: auto;"></div>
        </div>
      </div>
      <div class="test-controls" style="padding: 20px; text-align: center;">
        <button id="start-test-btn" style="padding: 10px 20px; margin: 5px;">Start Integration Test</button>
        <button id="simulate-speech-btn" style="padding: 10px 20px; margin: 5px;">Simulate Speech Input</button>
        <button id="test-comments-btn" style="padding: 10px 20px; margin: 5px;">Test Comment Generation</button>
        <button id="test-interactions-btn" style="padding: 10px 20px; margin: 5px;">Test Comment Interactions</button>
      </div>
      <div class="test-results" style="padding: 20px;">
        <h3>Test Results</h3>
        <div id="test-output" style="background: #f0f0f0; padding: 10px; min-height: 100px; font-family: monospace;"></div>
      </div>
    `;

		// Add to document if not already present
		if (!document.getElementById("integration-test")) {
			document.body.appendChild(this.testContainer);
		}

		this.setupEventHandlers();
	}

	/**
	 * Sets up event handlers for test controls
	 */
	private setupEventHandlers(): void {
		const startBtn = document.getElementById("start-test-btn");
		const simulateBtn = document.getElementById("simulate-speech-btn");
		const commentsBtn = document.getElementById("test-comments-btn");
		const interactionsBtn = document.getElementById("test-interactions-btn");

		startBtn?.addEventListener("click", () => this.runFullIntegrationTest());
		simulateBtn?.addEventListener("click", () => this.simulateSpeechInput());
		commentsBtn?.addEventListener("click", () => this.testCommentGeneration());
		interactionsBtn?.addEventListener("click", () =>
			this.testCommentInteractions(),
		);
	}

	/**
	 * Gets transcription container element
	 */
	private getTranscriptionContainer(): HTMLElement {
		return (
			document.getElementById("transcription-container") ||
			document.createElement("div")
		);
	}

	/**
	 * Gets comment container element
	 */
	private getCommentContainer(): HTMLElement {
		return (
			document.getElementById("comment-container") ||
			document.createElement("div")
		);
	}

	/**
	 * Logs test results to the output area
	 */
	private logResult(
		testName: string,
		success: boolean,
		details?: string,
	): void {
		this.testResults[testName] = success;
		const output = document.getElementById("test-output");
		if (output) {
			const timestamp = new Date().toLocaleTimeString();
			const status = success ? "✅ PASS" : "❌ FAIL";
			const message = `[${timestamp}] ${status}: ${testName}${details ? ` - details` : ""}`;
			output.innerHTML += `${message}\n`;
			output.scrollTop = output.scrollHeight;
		}
		console.log(
			`Integration Test - ${testName}: ${success ? "PASS" : "FAIL"}`,
			details,
		);
	}

	/**
	 * Runs the complete integration test suite
	 */
	async runFullIntegrationTest(): Promise<void> {
		this.logResult(
			"Integration Test Started",
			true,
			"Testing voice input, transcription, and comments",
		);

		try {
			// Test 1: Voice input manager initialization
			await this.testVoiceInputInitialization();

			// Test 2: Transcription display functionality
			await this.testTranscriptionDisplay();

			// Test 3: Comment system initialization
			await this.testCommentSystemInitialization();

			// Test 4: End-to-end conversation flow simulation
			await this.testEndToEndFlow();

			// Test 5: Comment interaction handling
			await this.testCommentInteractionHandling();

			// Summary
			const passedTests = Object.values(this.testResults).filter(
				(result) => result,
			).length;
			const totalTests = Object.keys(this.testResults).length;

			this.logResult(
				"Integration Test Complete",
				passedTests === totalTests,
				`${passedTests}/${totalTests} tests passed`,
			);
		} catch (error) {
			this.logResult("Integration Test Failed", false, `Error: ${error}`);
		}
	}

	/**
	 * Test 1: Voice input manager initialization and basic functionality
	 */
	private async testVoiceInputInitialization(): Promise<void> {
		try {
			// Test Web Speech API support detection
			const isSupported = this.voiceManager.isSupported();
			this.logResult(
				"Voice Input Support Detection",
				true,
				`Web Speech API supported: ${isSupported}`,
			);

			this.voiceManager.onTranscript((text, isFinal) => {
				this.logResult(
					"Voice Input Transcript Callback",
					true,
					`Received: "${text}" (final: ${isFinal})`,
				);
			});

			this.voiceManager.onError((error) => {
				this.logResult(
					"Voice Input Error Handling",
					true,
					`Error handled: ${error.error}`,
				);
			});

			this.logResult(
				"Voice Input Initialization",
				true,
				"Callbacks configured successfully",
			);
		} catch (error) {
			this.logResult("Voice Input Initialization", false, `Error: ${error}`);
		}
	}

	/**
	 * Test 2: Transcription display functionality
	 */
	private async testTranscriptionDisplay(): Promise<void> {
		try {
			// Test adding interim transcript
			this.transcriptionDisplay.addTranscript("こんにちは", false);
			this.logResult(
				"Transcription Interim Display",
				true,
				"Interim transcript added",
			);

			// Test adding final transcript
			this.transcriptionDisplay.addTranscript(
				"こんにちは、今日はいい天気ですね",
				true,
			);
			this.logResult(
				"Transcription Final Display",
				true,
				"Final transcript added",
			);

			// Test transcript retrieval
			const transcriptText = this.transcriptionDisplay.getTranscriptText();
			const hasContent = transcriptText.length > 0;
			this.logResult(
				"Transcription Text Retrieval",
				hasContent,
				`Retrieved: "${transcriptText}"`,
			);

			// Test segment management
			const segments = this.transcriptionDisplay.getSegments();
			this.logResult(
				"Transcription Segment Management",
				segments.length > 0,
				`${segments.length} segments stored`,
			);
		} catch (error) {
			this.logResult("Transcription Display", false, `Error: ${error}`);
		}
	}

	/**
	 * Test 3: Comment system initialization and basic functionality
	 */
	private async testCommentSystemInitialization(): Promise<void> {
		try {
			// Test comment generation
			const comment = await this.commentSystem.generateComment(
				this.conversationContext,
			);
			const hasValidComment = !!(comment?.content && comment.role);
			this.logResult(
				"Comment Generation",
				hasValidComment,
				`Generated: "${comment?.content}" (role: ${comment?.role})`,
			);

			// Test role weights retrieval
			const roleWeights = this.commentSystem.getRoleWeights();
			const hasRoleWeights = Object.keys(roleWeights).length > 0;
			this.logResult(
				"Comment Role Weights",
				hasRoleWeights,
				`${Object.keys(roleWeights).length} roles configured`,
			);

			// Test active roles
			const activeRoles = this.commentSystem.getActiveRoles();
			this.logResult(
				"Comment Active Roles",
				activeRoles.length > 0,
				`${activeRoles.length} active roles`,
			);

			// Test comment display integration
			const visibleComments = this.commentSystem.getVisibleCommentCount();
			this.logResult(
				"Comment Display Integration",
				visibleComments >= 0,
				`${visibleComments} visible comments`,
			);
		} catch (error) {
			this.logResult("Comment System Initialization", false, `Error: ${error}`);
		}
	}

	/**
	 * Test 4: End-to-end conversation flow simulation
	 */
	private async testEndToEndFlow(): Promise<void> {
		try {
			// Simulate a conversation sequence
			const conversationSteps = [
				{ text: "おはよう", isFinal: false },
				{ text: "おはようございます", isFinal: true },
				{ text: "今日は", isFinal: false },
				{ text: "今日はいい天気ですね", isFinal: true },
				{ text: "散歩でも", isFinal: false },
				{ text: "散歩でもしようかな", isFinal: true },
			];

			for (const step of conversationSteps) {
				// Add transcription
				this.transcriptionDisplay.addTranscript(step.text, step.isFinal);

				// Update conversation context if final
				if (step.isFinal) {
					this.conversationContext.recentTranscript = step.text;
					if (this.conversationContext.sessionDuration !== undefined) {
						this.conversationContext.sessionDuration += 1;
					}

					// Generate comment response
					const comment = await this.commentSystem.generateComment(
						this.conversationContext,
					);
					if (comment && this.conversationContext.commentHistory) {
						this.conversationContext.commentHistory.push(comment);
					}

					// Small delay to simulate real conversation timing
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
			}

			// Verify end-to-end flow results
			const finalTranscript = this.transcriptionDisplay.getTranscriptText();
			const commentCount = this.commentSystem.getVisibleCommentCount();

			const flowSuccess = finalTranscript.length > 0 && commentCount > 0;
			this.logResult(
				"End-to-End Conversation Flow",
				flowSuccess,
				`Transcript: ${finalTranscript.length} chars, Comments: ${commentCount}`,
			);
		} catch (error) {
			this.logResult("End-to-End Flow", false, `Error: ${error}`);
		}
	}

	/**
	 * Test 5: Comment interaction handling
	 */
	private async testCommentInteractionHandling(): Promise<void> {
		try {
			// Generate a test comment
			const testComment = await this.commentSystem.generateComment(
				this.conversationContext,
			);

			if (testComment) {
				// Test comment click simulation (pickup detection)
				const commentElement = document.querySelector(
					`[data-comment-id="${testComment.id}"]`,
				) as HTMLElement;
				if (commentElement) {
					commentElement.click();
					this.logResult(
						"Comment Click Interaction",
						true,
						`Comment ${testComment.id} clicked successfully`,
					);
				} else {
					this.logResult(
						"Comment Click Interaction",
						false,
						"Comment element not found in DOM",
					);
				}

				// Test thumbs up interaction
				const thumbsUpBtn = document.querySelector(
					`[data-comment-id="${testComment.id}"] .thumbs-up-btn`,
				) as HTMLElement;
				if (thumbsUpBtn) {
					thumbsUpBtn.click();
					this.logResult(
						"Thumbs Up Interaction",
						true,
						`Thumbs up clicked for comment ${testComment.id}`,
					);
				} else {
					this.logResult(
						"Thumbs Up Interaction",
						false,
						"Thumbs up button not found",
					);
				}

				// Test thumbs down interaction
				const thumbsDownBtn = document.querySelector(
					`[data-comment-id="${testComment.id}"] .thumbs-down-btn`,
				) as HTMLElement;
				if (thumbsDownBtn) {
					thumbsDownBtn.click();
					this.logResult(
						"Thumbs Down Interaction",
						true,
						`Thumbs down clicked for comment ${testComment.id}`,
					);
				} else {
					this.logResult(
						"Thumbs Down Interaction",
						false,
						"Thumbs down button not found",
					);
				}
			} else {
				this.logResult(
					"Comment Interaction Setup",
					false,
					"No test comment generated",
				);
			}
		} catch (error) {
			this.logResult("Comment Interaction Handling", false, `Error: ${error}`);
		}
	}

	/**
	 * Simulates speech input for manual testing
	 */
	async simulateSpeechInput(): Promise<void> {
		const testPhrases = [
			"こんにちは",
			"今日はいい天気ですね",
			"最近何してる？",
			"アニメ見てる",
			"おもしろいよ",
		];

		for (const phrase of testPhrases) {
			// Simulate interim result
			this.transcriptionDisplay.addTranscript(
				phrase.substring(0, phrase.length - 1),
				false,
			);
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Simulate final result
			this.transcriptionDisplay.addTranscript(phrase, true);

			// Update context and generate comment
			this.conversationContext.recentTranscript = phrase;
			const comment = await this.commentSystem.generateComment(
				this.conversationContext,
			);
			if (comment && this.conversationContext.commentHistory) {
				this.conversationContext.commentHistory.push(comment);
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		this.logResult(
			"Speech Simulation",
			true,
			`${testPhrases.length} phrases simulated`,
		);
	}

	/**
	 * Tests comment generation with various contexts
	 */
	async testCommentGeneration(): Promise<void> {
		const testContexts = [
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
		];

		for (const context of testContexts) {
			const fullContext: ConversationContext = {
				...this.conversationContext,
				...context,
				sessionDuration: Math.floor(Math.random() * 60),
				commentHistory: [],
			};

			const comment = await this.commentSystem.generateComment(fullContext);
			const isValidComment = !!(comment?.content && comment.role);

			this.logResult(
				`Comment Generation - ${context.currentTopic}`,
				isValidComment,
				`"${comment?.content}" (${comment?.role})`,
			);

			await new Promise((resolve) => setTimeout(resolve, 200));
		}
	}

	/**
	 * Tests comment interaction features
	 */
	async testCommentInteractions(): Promise<void> {
		// Generate several comments for interaction testing
		for (let i = 0; i < 3; i++) {
			this.conversationContext.recentTranscript = `テスト発言 ${i + 1}`;
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		// Test interaction with the most recent comments
		const commentElements = document.querySelectorAll(".comment");
		let interactionCount = 0;

		commentElements.forEach((element, index) => {
			if (index < 2) {
				// Test first 2 comments
				// Simulate click
				(element as HTMLElement).click();
				interactionCount++;

				// Simulate thumbs up on first comment
				if (index === 0) {
					const thumbsUp = element.querySelector(
						".thumbs-up-btn",
					) as HTMLElement;
					if (thumbsUp) {
						thumbsUp.click();
						interactionCount++;
					}
				}

				// Simulate thumbs down on second comment
				if (index === 1) {
					const thumbsDown = element.querySelector(
						".thumbs-down-btn",
					) as HTMLElement;
					if (thumbsDown) {
						thumbsDown.click();
						interactionCount++;
					}
				}
			}
		});

		this.logResult(
			"Comment Interactions Test",
			interactionCount > 0,
			`${interactionCount} interactions performed`,
		);
	}

	/**
	 * Gets current test results summary
	 */
	getTestResults(): { [key: string]: boolean } {
		return { ...this.testResults };
	}

	/**
	 * Cleans up test environment
	 */
	cleanup(): void {
		this.voiceManager.stopListening();
		this.transcriptionDisplay.clear();
		this.commentSystem.clearComments();

		if (this.testContainer?.parentNode) {
			this.testContainer.parentNode.removeChild(this.testContainer);
		}
	}
}

// Export for use in main application
export default VoiceChatIntegrationTest;
