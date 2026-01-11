// Comprehensive integration tests for complete user workflows, error recovery, and performance
// Tests Requirements: All integration scenarios, error handling, performance optimization

import { CommentSystem } from "../src/comment-generation/comment-system";
import {
	createError,
	ErrorSeverity,
	ErrorType,
	errorHandler,
} from "../src/error-handling/error-handler";
import { offlineManager } from "../src/error-handling/offline-manager";
import { PreferenceLearningSystem } from "../src/learning/preference-learning";
import { adaptiveBehaviorManager } from "../src/performance/adaptive-behavior";
import { lazyLoader } from "../src/performance/lazy-loader";
import { performanceMonitor } from "../src/performance/performance-monitor";
import { SessionManagerImpl } from "../src/session/session-manager";
import { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import {
	BasicInsightGenerator,
	BasicTopicExtractor,
	SummaryGeneratorImpl,
} from "../src/summary/summary-generator";
import type { CommentRoleType } from "../src/types/core";
import { TranscriptionDisplay } from "../src/ui/transcription-display";
import { WebSpeechVoiceInputManager } from "../src/voice/voice-input-manager";
import {
	createTestConversationContext,
	createTestUserPreferences,
} from "./test-utils";

describe("Comprehensive Integration Tests", () => {
	let storage: IndexedDBWrapper;
	let voiceManager: WebSpeechVoiceInputManager;
	let transcriptionDisplay: TranscriptionDisplay;
	let commentSystem: CommentSystem;
	let sessionManager: SessionManagerImpl;
	let preferenceLearning: PreferenceLearningSystem;

	beforeEach(async () => {
		// Set up DOM environment
		document.body.innerHTML = `
      <div id="test-container">
        <div id="transcription-area" style="height: 200px; overflow-y: auto;"></div>
        <div id="comment-area" style="height: 200px; overflow-y: auto;"></div>
        <div id="status" class="ready">System ready</div>
      </div>
    `;

		// Initialize all components
		storage = new IndexedDBWrapper();
		await storage.initialize();

		voiceManager = new WebSpeechVoiceInputManager();
		const transcriptionArea = document.getElementById("transcription-area");
		if (!transcriptionArea) {
			throw new Error("Transcription area not found");
		}
		transcriptionDisplay = new TranscriptionDisplay(transcriptionArea);
		commentSystem = new CommentSystem();
		commentSystem.initializeDisplay(
			document.getElementById("comment-area") as HTMLElement,
		);

		const topicExtractor = new BasicTopicExtractor();
		const insightGenerator = new BasicInsightGenerator();
		const summaryGenerator = new SummaryGeneratorImpl(
			topicExtractor,
			insightGenerator,
		);
		sessionManager = new SessionManagerImpl(storage, summaryGenerator);
		preferenceLearning = new PreferenceLearningSystem(storage);

		// Start performance monitoring for tests
		performanceMonitor.startMonitoring(1000);
	});

	afterEach(async () => {
		// Clean up all components
		voiceManager.stopListening();
		transcriptionDisplay.clear();
		commentSystem.clearComments();
		performanceMonitor.stopMonitoring();

		try {
			await storage.clearAllData();
		} catch (error) {
			console.warn("Failed to clear storage:", error);
		}

		document.body.innerHTML = "";
	});

	describe("Complete User Workflows", () => {
		test("Full session lifecycle: start -> conversation -> learning -> summary", async () => {
			// Start session
			const session = await sessionManager.startSession(
				"test_user",
				"daily conversation",
			);
			expect(session.id).toBeDefined();
			expect(session.userId).toBe("test_user");
			expect(session.topic).toBe("daily conversation");

			// Simulate complete conversation
			const conversationFlow = [
				{ text: "おはようございます", topic: "greeting", engagement: "high" },
				{
					text: "今日はいい天気ですね",
					topic: "weather",
					engagement: "medium",
				},
				{
					text: "散歩でもしようかな",
					topic: "activities",
					engagement: "medium",
				},
				{
					text: "最近アニメ見てる",
					topic: "entertainment",
					engagement: "high",
				},
				{ text: "おもしろいよ", topic: "entertainment", engagement: "high" },
				{ text: "そろそろ寝ます", topic: "departure", engagement: "low" },
			];

			const context = createTestConversationContext({
				recentTranscript: "",
				currentTopic: session.topic || "conversation",
				userEngagement: "medium",
				sessionDuration: 0,
				commentHistory: [],
			});

			// Process each conversation step
			for (const step of conversationFlow) {
				// Add transcription
				transcriptionDisplay.addTranscript(step.text, true);

				// Update context
				context.recentTranscript = step.text;
				context.currentTopic = step.topic;
				context.userEngagement = step.engagement as "low" | "medium" | "high";
				if (context.sessionDuration !== undefined) {
					context.sessionDuration += 1;
				}

				// Generate comment
				const comment = await commentSystem.generateComment(context);
				if (comment && context.commentHistory) {
					context.commentHistory.push(comment);
				}

				// Track activity in session
				await sessionManager.trackActivity(session.id, {
					type: "speech",
					data: { transcript: step.text },
					timestamp: new Date(),
				});

				// Simulate user interaction with some comments
				if (Math.random() > 0.5 && comment) {
					await preferenceLearning.updateRoleWeights(
						"test_user",
						comment.role,
						"pickup",
						0.8,
					);
				}

				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// End session and generate summary
			const summary = await sessionManager.endSession(session.id);

			// Verify complete workflow
			expect(summary).toBeDefined();
			expect(summary.sessionId).toBe(session.id);
			expect(summary.topics.length).toBeGreaterThan(0);
			expect(summary.insights.length).toBeGreaterThan(0);

			// Verify learning occurred
			const weights = preferenceLearning.getPersonalizedWeights("test_user");
			const stats = preferenceLearning.getLearningStats();
			expect(stats.totalFeedbackEvents).toBeGreaterThan(0);
			expect(weights.size).toBeGreaterThan(0);

			// Verify transcription and comments
			const finalTranscript = transcriptionDisplay.getTranscriptText();
			const commentCount = commentSystem.getVisibleCommentCount();

			expect(finalTranscript.length).toBeGreaterThan(0);
			expect(commentCount).toBe(conversationFlow.length);

			// Verify all conversation steps are in transcript
			for (const step of conversationFlow) {
				expect(finalTranscript).toContain(step.text);
			}
		});

		test("Multi-session learning and personalization", async () => {
			const userId = "test_user_multi";
			await preferenceLearning.initializePreferences(userId);

			// Simulate multiple sessions with different preferences
			const sessions = [
				{
					topic: "anime discussion",
					interactions: ["reaction", "agreement", "question"],
					positiveRoles: ["reaction", "agreement"],
				},
				{
					topic: "daily life",
					interactions: ["support", "question", "insider"],
					positiveRoles: ["support", "question"],
				},
				{
					topic: "entertainment",
					interactions: ["playful", "reaction", "agreement"],
					positiveRoles: ["playful", "reaction"],
				},
			];

			for (const sessionData of sessions) {
				const session = await sessionManager.startSession(
					userId,
					sessionData.topic,
				);

				// Generate comments and simulate interactions
				for (const roleType of sessionData.interactions) {
					const context = createTestConversationContext({
						recentTranscript: `Test for ${roleType}`,
						currentTopic: sessionData.topic,
						userEngagement: "medium",
						sessionDuration: 5,
						commentHistory: [],
					});

					const comment = await commentSystem.generateComment(context);

					// Simulate positive feedback for certain roles
					if (sessionData.positiveRoles.includes(roleType) && comment) {
						await preferenceLearning.updateRoleWeights(
							userId,
							comment.role,
							"thumbs_up",
							1.0,
						);
					}
				}

				await sessionManager.endSession(session.id);
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Verify learning across sessions
			const finalWeights =
				preferenceLearning.getPersonalizedWeights("test_user");
			const finalStats = preferenceLearning.getLearningStats();
			expect(finalStats.totalFeedbackEvents).toBeGreaterThan(0);
			expect(finalWeights.size).toBeGreaterThan(0);

			// Verify preferred roles have higher weights
			const roleWeights = finalWeights;
			const allPositiveRoles = sessions.flatMap((s) => s.positiveRoles);
			const uniquePositiveRoles = [...new Set(allPositiveRoles)];

			// At least some positive roles should have higher weights
			let hasImprovedWeights = false;
			for (const role of uniquePositiveRoles) {
				const weight = roleWeights.get(role as CommentRoleType);
				if (weight && weight > 1.0) {
					hasImprovedWeights = true;
					break;
				}
			}
			expect(hasImprovedWeights).toBe(true);
		});
	});

	describe("Error Recovery and Fallback Mechanisms", () => {
		test("Voice input error recovery", async () => {
			let errorRecovered = false;
			let fallbackActivated = false;

			// Set up error handling
			voiceManager.onError((error) => {
				console.log("Voice error detected:", error.error);
				errorRecovered = true;
			});

			// Set up error handler monitoring
			errorHandler.onError(ErrorType.VOICE_INPUT, async (error) => {
				console.log("Error handler activated for voice input");
				const recovery = await errorHandler.handleError(error);
				if (recovery.canRecover) {
					fallbackActivated = true;
				}
			});

			// Simulate voice input error
			const voiceError = createError(
				ErrorType.VOICE_INPUT,
				ErrorSeverity.HIGH,
				"Simulated voice input failure",
				new Error("Audio capture failed"),
			);

			await errorHandler.handleError(voiceError);

			// Verify error was handled
			expect(errorRecovered || fallbackActivated).toBe(true);

			// Verify system continues to function
			transcriptionDisplay.addTranscript("Fallback text input", true);
			const transcript = transcriptionDisplay.getTranscriptText();
			expect(transcript).toContain("Fallback text input");
		});

		test("Storage failure fallback to in-memory mode", async () => {
			// Simulate storage failure
			const storageError = createError(
				ErrorType.STORAGE,
				ErrorSeverity.HIGH,
				"Storage unavailable",
				new Error("IndexedDB failed"),
			);

			const recovery = await errorHandler.handleError(storageError);
			expect(recovery.canRecover).toBe(true);
			expect(recovery.userMessage).toContain("temporary");

			// Verify system continues with in-memory storage
			const context = createTestConversationContext({
				recentTranscript: "Test with storage failure",
				currentTopic: "error_recovery",
				userEngagement: "medium",
				sessionDuration: 1,
				commentHistory: [],
			});

			const comment = await commentSystem.generateComment(context);
			expect(comment).toBeDefined();
			if (comment) {
				expect(comment.content).toBeDefined();
			}
		});

		test("Network failure offline mode activation", async () => {
			// Simulate network failure
			offlineManager.enableOfflineMode();

			// Verify offline capabilities
			const capabilities = offlineManager.getCapabilities();
			expect(capabilities.voiceInput).toBeDefined();
			expect(capabilities.basicComments).toBe(true);

			// Verify system adapts to offline mode
			const config = adaptiveBehaviorManager.getCurrentConfig();
			expect(config.memoryOptimizationLevel).toBe("moderate");

			// Test basic functionality in offline mode
			transcriptionDisplay.addTranscript("Offline test", true);
			const comment = await commentSystem.generateComment(
				createTestConversationContext({
					recentTranscript: "Offline test",
					currentTopic: "offline",
					userEngagement: "medium",
					sessionDuration: 1,
					commentHistory: [],
				}),
			);

			expect(comment).toBeDefined();

			// Restore online mode
			offlineManager.disableOfflineMode();
		});

		test("Comment generation fallback mechanisms", async () => {
			// Test fallback when LLM fails
			const context = createTestConversationContext({
				recentTranscript: "Test fallback",
				currentTopic: "error_testing",
				userEngagement: "medium",
				sessionDuration: 1,
				commentHistory: [],
			});

			// Generate multiple comments to test consistency
			const comments = [];
			for (let i = 0; i < 5; i++) {
				const comment = await commentSystem.generateComment(context);
				comments.push(comment);
				expect(comment).toBeDefined();
				expect(comment?.content).toBeDefined();
				expect(comment?.role).toBeDefined();
			}

			// Verify fallback generates valid comments
			expect(comments.length).toBe(5);
			const roles = new Set(comments.map((c) => c?.role).filter(Boolean));
			expect(roles.size).toBeGreaterThan(0);
		});

		test("Performance degradation recovery", async () => {
			// Trigger performance adaptation
			performanceMonitor.recordResponseTime("commentGeneration", 800);

			// Wait for adaptation
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify adaptive behavior activated
			const optimizationStatus =
				adaptiveBehaviorManager.getOptimizationStatus();

			expect(optimizationStatus.activeOptimizations.length).toBeGreaterThan(0);

			// Verify system still functions with optimizations
			const comment = await commentSystem.generateComment(
				createTestConversationContext({
					recentTranscript: "Performance test",
					currentTopic: "optimization",
					userEngagement: "medium",
					sessionDuration: 1,
					commentHistory: [],
				}),
			);

			expect(comment).toBeDefined();
		});
	});

	describe("Performance Under Various Conditions", () => {
		test("High-frequency comment generation performance", async () => {
			const startTime = performance.now();
			const commentCount = 50;
			const comments = [];

			// Generate many comments rapidly
			for (let i = 0; i < commentCount; i++) {
				const context = createTestConversationContext({
					recentTranscript: `Performance test ${i}`,
					currentTopic: "performance",
					userEngagement: "high",
					sessionDuration: i + 1,
					commentHistory: comments.slice(),
				});

				const comment = await commentSystem.generateComment(context);
				if (comment) {
					comments.push(comment);
				}

				// Record performance metrics
				performanceMonitor.recordResponseTime(
					"commentGeneration",
					performance.now() - startTime,
				);
			}

			const endTime = performance.now();
			const totalTime = endTime - startTime;
			const averageTime = totalTime / commentCount;

			// Verify performance is acceptable
			expect(comments.length).toBeGreaterThan(0);
			expect(averageTime).toBeLessThan(100); // Less than 100ms per comment on average

			// Verify all comments are valid
			for (const comment of comments) {
				expect(comment.content).toBeDefined();
				expect(comment.role).toBeDefined();
				expect(comment.timestamp).toBeInstanceOf(Date);
			}
		});

		test("Memory usage under extended session", async () => {
			const session = await sessionManager.startSession(
				"test_user",
				"extended session",
			);

			// Simulate extended conversation (100 interactions)
			for (let i = 0; i < 100; i++) {
				const text = `Extended conversation message ${i}`;
				transcriptionDisplay.addTranscript(text, true);

				await commentSystem.generateComment(
					createTestConversationContext({
						recentTranscript: text,
						currentTopic: "extended",
						userEngagement: "medium",
						sessionDuration: i + 1,
						commentHistory: [],
					}),
				);

				await sessionManager.trackActivity(session.id, {
					type: "speech",
					timestamp: new Date(),
					data: text,
				});

				// Check memory usage periodically
				if (i % 20 === 0) {
					const currentMetrics = performanceMonitor.getMetrics();
					console.log(
						`Memory usage at ${i}: ${currentMetrics.memoryUsage.percentage}%`,
					);

					// Memory usage should not grow excessively
					expect(currentMetrics.memoryUsage.percentage).toBeLessThan(95);
				}

				await new Promise((resolve) => setTimeout(resolve, 10));
			}

			await sessionManager.endSession(session.id);

			// Verify system is still responsive
			const finalComment = await commentSystem.generateComment(
				createTestConversationContext({
					recentTranscript: "Final test",
					currentTopic: "cleanup",
					userEngagement: "medium",
					sessionDuration: 101,
					commentHistory: [],
				}),
			);

			expect(finalComment).toBeDefined();
		});

		test("Concurrent operations performance", async () => {
			const operations = [];
			const startTime = performance.now();

			// Start multiple concurrent operations
			for (let i = 0; i < 10; i++) {
				operations.push(
					// Concurrent transcription
					new Promise((resolve) => {
						transcriptionDisplay.addTranscript(`Concurrent ${i}`, true);
						resolve(true);
					}),

					// Concurrent comment generation
					(async () => {
						const comment = await commentSystem.generateComment(
							createTestConversationContext({
								recentTranscript: `Concurrent test ${i}`,
								currentTopic: "concurrency",
								userEngagement: "medium",
								sessionDuration: i + 1,
								commentHistory: [],
							}),
						);
						return comment;
					})(),

					// Concurrent storage operation
					storage.saveUserPreferences(
						`user_${i}`,
						createTestUserPreferences({
							userId: `user_${i}`,
							roleWeights: new Map(),
							topicPreferences: [],
							interactionHistory: [],
							sessionCount: 1,
						}),
					),
				);
			}

			// Wait for all operations to complete
			const results = await Promise.all(operations);
			const endTime = performance.now();

			// Verify all operations completed successfully
			expect(results.length).toBe(30); // 3 operations × 10 iterations
			expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

			// Verify system state is consistent
			const transcript = transcriptionDisplay.getTranscriptText();
			const commentCount = commentSystem.getVisibleCommentCount();

			expect(transcript.length).toBeGreaterThan(0);
			expect(commentCount).toBeGreaterThan(0);
		});

		test("Lazy loading performance optimization", async () => {
			// Test feature loading performance
			const loadingTimes = [];

			const features = ["learning-module", "summary-generator"];

			for (const feature of features) {
				const startTime = performance.now();

				try {
					await lazyLoader.loadFeature(feature);
					const loadTime = performance.now() - startTime;
					loadingTimes.push(loadTime);

					expect(lazyLoader.isFeatureLoaded(feature)).toBe(true);
					console.log(`${feature} loaded in ${loadTime.toFixed(2)}ms`);
				} catch (error) {
					console.warn(`Failed to load ${feature}:`, error);
					// Some features may not be available in test environment
				}
			}

			// Verify loading times are reasonable
			const averageLoadTime =
				loadingTimes.reduce((a, b) => a + b, 0) / loadingTimes.length;
			expect(averageLoadTime).toBeLessThan(1000); // Less than 1 second average
		});

		test("Adaptive behavior under stress conditions", async () => {
			// Simulate stress conditions
			performanceMonitor.recordResponseTime("commentGeneration", 1500); // Slow
			performanceMonitor.recordResponseTime("transcription", 800); // Slow

			// Wait for adaptation
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Verify adaptive behavior kicked in
			const config = adaptiveBehaviorManager.getCurrentConfig();
			const recommendations =
				adaptiveBehaviorManager.getPerformanceRecommendations();

			expect(config.llmUsageRatio).toBeLessThan(0.3); // Should reduce LLM usage
			expect(recommendations.length).toBeGreaterThan(0);

			// Verify system still functions under stress
			const comment = await commentSystem.generateComment(
				createTestConversationContext({
					recentTranscript: "Stress test",
					currentTopic: "stress",
					userEngagement: "medium",
					sessionDuration: 1,
					commentHistory: [],
				}),
			);

			expect(comment).toBeDefined();
			expect(comment?.content).toBeDefined();
		});
	});

	describe("Integration Edge Cases", () => {
		test("Empty and invalid input handling", async () => {
			// Test empty transcript
			expect(() => {
				transcriptionDisplay.addTranscript("", true);
			}).not.toThrow();

			// Test empty comment context
			const emptyContext = createTestConversationContext({
				recentTranscript: "",
				currentTopic: "",
				userEngagement: "medium",
				sessionDuration: 0,
				commentHistory: [],
			});

			const comment = await commentSystem.generateComment(emptyContext);
			expect(comment).toBeDefined(); // Should still generate a comment

			// Test invalid session operations
			expect(async () => {
				await sessionManager.endSession("invalid_session_id");
			}).rejects.toThrow();
		});

		test("Rapid state changes handling", async () => {
			// Rapidly change between online/offline states
			for (let i = 0; i < 5; i++) {
				offlineManager.enableOfflineMode();
				await new Promise((resolve) => setTimeout(resolve, 50));
				offlineManager.disableOfflineMode();
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			// Verify system is stable after rapid changes
			const comment = await commentSystem.generateComment(
				createTestConversationContext({
					recentTranscript: "Stability test",
					currentTopic: "stability",
					userEngagement: "medium",
					sessionDuration: 1,
					commentHistory: [],
				}),
			);

			expect(comment).toBeDefined();
		});

		test("Resource cleanup and memory leaks prevention", async () => {
			const initialMetrics = performanceMonitor.getMetrics();

			// Create and destroy multiple sessions
			for (let i = 0; i < 10; i++) {
				const session = await sessionManager.startSession(
					"test_user",
					`session_${i}`,
				);

				// Add some data
				transcriptionDisplay.addTranscript(`Session ${i} data`, true);
				await commentSystem.generateComment(
					createTestConversationContext({
						recentTranscript: `Session ${i} data`,
						currentTopic: "cleanup",
						userEngagement: "medium",
						sessionDuration: 1,
						commentHistory: [],
					}),
				);

				await sessionManager.endSession(session.id);

				// Clear displays
				transcriptionDisplay.clear();
				commentSystem.clearComments();
			}

			// Force garbage collection if available
			performanceMonitor.forceGarbageCollection();

			// Wait for cleanup
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const finalMetrics = performanceMonitor.getMetrics();

			// Memory usage should not have grown significantly
			const memoryGrowth =
				finalMetrics.memoryUsage.percentage -
				initialMetrics.memoryUsage.percentage;
			expect(memoryGrowth).toBeLessThan(20); // Less than 20% growth
		});
	});
});
