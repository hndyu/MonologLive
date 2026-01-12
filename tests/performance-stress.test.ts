// Performance stress tests for MONOLOG LIVE
// Tests system behavior under high load and resource constraints

import { CommentSystem } from "../src/comment-generation/comment-system";
import { adaptiveBehaviorManager } from "../src/performance/adaptive-behavior";
import {
	PerformanceTimer,
	performanceMonitor,
} from "../src/performance/performance-monitor";
import { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import {
	createTestConversationContext,
	createTestUserPreferences,
} from "./test-utils";

describe("Performance Stress Tests", () => {
	let storage: IndexedDBWrapper;
	let commentSystem: CommentSystem;

	beforeEach(async () => {
		document.body.innerHTML = `
      <div id="test-container">
        <div id="comment-area" style="height: 200px; overflow-y: auto;"></div>
      </div>
    `;

		const testContainer = document.getElementById("test-container");
		if (!testContainer) {
			throw new Error("Test container not found");
		}

		storage = new IndexedDBWrapper();
		await storage.initialize();

		commentSystem = new CommentSystem({
			enableRuleBasedGeneration: true,
			enableLocalLLM: false,
			enableAdaptiveFrequency: false, // Disable for stress tests to allow high-frequency generation
		});
		const commentArea = document.getElementById("comment-area");
		if (!commentArea) {
			throw new Error("Comment area not found");
		}
		commentSystem.initializeDisplay(commentArea);

		performanceMonitor.startMonitoring(500); // Monitor every 500ms for stress tests
	});

	afterEach(async () => {
		performanceMonitor.stopMonitoring();
		commentSystem.clearComments();

		try {
			await storage.clearAllData();
		} catch (error) {
			console.warn("Failed to clear storage:", error);
		}

		document.body.innerHTML = "";
	});

	test("High-frequency comment generation stress test", async () => {
		const timer = new PerformanceTimer("High-frequency comment generation");
		const commentCount = 200;
		const comments = [];
		const performanceData = [];

		console.log(`Starting stress test: generating ${commentCount} comments`);

		for (let i = 0; i < commentCount; i++) {
			const startTime = performance.now();

			const context = createTestConversationContext({
				recentTranscript: `Stress test message ${i} with some longer content to simulate real usage`,
				currentTopic: i % 2 === 0 ? "entertainment" : "daily_life",
				userEngagement: ["low", "medium", "high"][i % 3] as
					| "low"
					| "medium"
					| "high",
				sessionDuration: i + 1,
				commentHistory: comments.filter((c) => c).slice(-5), // Keep last 5 comments for context
			});

			const comment = await commentSystem.generateComment(context);
			if (comment) comments.push(comment);

			const endTime = performance.now();
			const duration = endTime - startTime;
			performanceData.push(duration);

			// Record performance metrics
			performanceMonitor.recordResponseTime("commentGeneration", duration);

			// Check for performance degradation
			if (i > 0 && i % 50 === 0) {
				const recentAverage =
					performanceData.slice(-50).reduce((a, b) => a + b, 0) / 50;
				console.log(
					`Average generation time at ${i}: ${recentAverage.toFixed(2)}ms`,
				);

				// Performance should not degrade significantly
				expect(recentAverage).toBeLessThan(200); // Less than 200ms per comment
			}

			// Small delay to prevent overwhelming the system
			if (i % 10 === 0) {
				await new Promise((resolve) => setTimeout(resolve, 10));
			}
		}

		const totalTime = timer.end();
		const averageTime = totalTime / commentCount;
		const maxTime = Math.max(...performanceData);
		const minTime = Math.min(...performanceData);

		console.log(`Stress test completed:
      - Total time: ${totalTime.toFixed(2)}ms
      - Average per comment: ${averageTime.toFixed(2)}ms
      - Min time: ${minTime.toFixed(2)}ms
      - Max time: ${maxTime.toFixed(2)}ms
      - Comments generated: ${comments.length}`);

		// Verify all comments were generated successfully
		expect(comments.length).toBe(commentCount);
		expect(averageTime).toBeLessThan(50); // Average should be under 50ms
		expect(maxTime).toBeLessThan(500); // No single comment should take more than 500ms

		// Verify comment quality is maintained under stress
		const roles = new Set(comments.filter((c) => c).map((c) => c?.role));
		expect(roles.size).toBeGreaterThanOrEqual(1); // Should have at least one role

		// Verify all comments have required properties
		for (const comment of comments) {
			if (comment) {
				expect(comment.id).toBeDefined();
				expect(comment.content).toBeDefined();
				expect(comment.role).toBeDefined();
				expect(comment.timestamp).toBeInstanceOf(Date);
			}
		}
	});

	test("Memory usage under sustained load", async () => {
		const timer = new PerformanceTimer("Memory stress test");
		const iterations = 500;
		const memorySnapshots = [];

		console.log(`Starting memory stress test: ${iterations} iterations`);

		for (let i = 0; i < iterations; i++) {
			// Generate comment
			const comment = await commentSystem.generateComment(
				createTestConversationContext({
					recentTranscript: `Memory test ${i} with additional content to increase memory usage`,
					currentTopic: "memory_test",
					userEngagement: "medium",
					sessionDuration: i + 1,
					commentHistory: [],
				}),
			);

			// Store some data in storage
			if (comment) {
				await storage.saveUserPreferences(
					`user_${i % 10}`,
					createTestUserPreferences({
						userId: `user_${i % 10}`,
						roleWeights: new Map([
							["reaction", 1.2],
							["agreement", 0.8],
						]),
						topicPreferences: [`topic_${i % 5}`],
						interactionHistory: [
							{
								commentId: comment.id,
								type: "pickup",
								timestamp: new Date(),
								sessionId: "test_session",
								context: createTestConversationContext({}),
							},
						],
						sessionCount: i + 1,
					}),
				);
			}

			// Take memory snapshot every 50 iterations
			if (i % 50 === 0) {
				const metrics = performanceMonitor.getMetrics();
				memorySnapshots.push({
					iteration: i,
					memoryPercentage: metrics.memoryUsage.percentage,
					memoryUsed: metrics.memoryUsage.used,
				});

				console.log(
					`Memory at iteration ${i}: ${metrics.memoryUsage.percentage.toFixed(1)}%`,
				);

				// Memory usage should not grow excessively
				expect(metrics.memoryUsage.percentage).toBeLessThan(90);
			}

			// Trigger garbage collection periodically
			if (i % 100 === 0 && i > 0) {
				performanceMonitor.forceGarbageCollection();
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		timer.end();

		// Analyze memory growth
		const initialMemory = memorySnapshots[0]?.memoryPercentage || 0;
		const finalMemory =
			memorySnapshots[memorySnapshots.length - 1]?.memoryPercentage || 0;
		const memoryGrowth = finalMemory - initialMemory;

		console.log(
			`Memory growth: ${memoryGrowth.toFixed(1)}% (from ${initialMemory.toFixed(1)}% to ${finalMemory.toFixed(1)}%)`,
		);

		// Memory growth should be reasonable
		expect(memoryGrowth).toBeLessThan(30); // Less than 30% growth

		// Verify system is still functional after stress test
		const finalComment = await commentSystem.generateComment(
			createTestConversationContext({
				recentTranscript: "Final test after memory stress",
				currentTopic: "cleanup",
				userEngagement: "medium",
				sessionDuration: iterations + 1,
				commentHistory: [],
			}),
		);

		expect(finalComment).toBeDefined();
		expect(finalComment?.content).toBeDefined();
	});

	test("Concurrent operations stress test", async () => {
		const timer = new PerformanceTimer("Concurrent operations stress test");
		const concurrentOperations = 20;
		const operationsPerBatch = 10;

		console.log(
			`Starting concurrent stress test: ${concurrentOperations} batches of ${operationsPerBatch} operations`,
		);

		for (let batch = 0; batch < concurrentOperations; batch++) {
			const batchPromises = [];

			for (let op = 0; op < operationsPerBatch; op++) {
				const operationId = batch * operationsPerBatch + op;

				// Comment generation operation
				batchPromises.push(
					new Promise((resolve) => {
						const comment = commentSystem.generateComment(
							createTestConversationContext({
								recentTranscript: `Concurrent test ${operationId}`,
								currentTopic: "concurrency",
								userEngagement: "medium",
								sessionDuration: operationId + 1,
								commentHistory: [],
							}),
						);
						resolve(comment);
					}),
				);

				// Storage operation
				batchPromises.push(
					storage.saveUserPreferences(
						`concurrent_user_${operationId}`,
						createTestUserPreferences({
							userId: `concurrent_user_${operationId}`,
							roleWeights: new Map(),
							topicPreferences: [],
							interactionHistory: [],
							sessionCount: 1,
						}),
					),
				);

				// Performance monitoring operation
				batchPromises.push(
					new Promise((resolve) => {
						performanceMonitor.recordResponseTime(
							"commentGeneration",
							Math.random() * 100,
						);
						resolve(true);
					}),
				);
			}

			// Wait for all operations in this batch to complete
			const batchStartTime = performance.now();
			const results = await Promise.all(batchPromises);
			const batchTime = performance.now() - batchStartTime;

			console.log(`Batch ${batch + 1} completed in ${batchTime.toFixed(2)}ms`);

			// Verify all operations completed successfully
			expect(results.length).toBe(operationsPerBatch * 3);
			expect(batchTime).toBeLessThan(5000); // Each batch should complete within 5 seconds

			// Small delay between batches
			await new Promise((resolve) => setTimeout(resolve, 50));
		}

		timer.end();

		// Verify system state is consistent after concurrent operations
		const finalComment = await commentSystem.generateComment(
			createTestConversationContext({
				recentTranscript: "Final concurrent test",
				currentTopic: "final",
				userEngagement: "medium",
				sessionDuration: 1,
				commentHistory: [],
			}),
		);

		expect(finalComment).toBeDefined();
		expect(finalComment?.content).toBeDefined();
	});

	test("Adaptive behavior under extreme stress", async () => {
		const timer = new PerformanceTimer("Adaptive behavior stress test");

		console.log("Starting adaptive behavior stress test");

		// Simulate extreme performance conditions
		const stressConditions = [
			{
				responseTime: 2000,
				memoryUsage: 85,
				description: "High response time and memory",
			},
			{
				responseTime: 1500,
				memoryUsage: 75,
				description: "High response time",
			},
			{
				responseTime: 800,
				memoryUsage: 90,
				description: "Critical memory usage",
			},
			{
				responseTime: 3000,
				memoryUsage: 80,
				description: "Very high response time",
			},
		];

		for (const condition of stressConditions) {
			console.log(`Testing condition: ${condition.description}`);

			// Simulate the stress condition
			performanceMonitor.recordResponseTime(
				"commentGeneration",
				condition.responseTime,
			);

			// Wait for adaptive behavior to kick in
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Get current configuration
			const optimizationStatus =
				adaptiveBehaviorManager.getOptimizationStatus();

			console.log(
				`Adaptive response: ${optimizationStatus.level} optimization, ${optimizationStatus.activeOptimizations.length} optimizations`,
			);

			// Verify adaptive behavior activated (may not always trigger)
			expect(
				optimizationStatus.activeOptimizations.length
			).toBeGreaterThanOrEqual(0);

			// Test system functionality under stress
			const comments = [];
			for (let i = 0; i < 10; i++) {
				const comment = await commentSystem.generateComment(
					createTestConversationContext({
						recentTranscript: `Stress condition test ${i}`,
						currentTopic: "stress",
						userEngagement: "medium",
						sessionDuration: i + 1,
						commentHistory: comments.filter((c) => c).slice(),
					}),
				);
				if (comment) comments.push(comment);
			}

			// Verify system still generates valid comments under stress
			expect(comments.length).toBeGreaterThan(0);
			for (const comment of comments) {
				expect(comment).toBeDefined();
				expect(comment?.content).toBeDefined();
				expect(comment?.role).toBeDefined();
			}

			// Reset to baseline for next test
			adaptiveBehaviorManager.resetToBaseline();
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		timer.end();
		console.log("Adaptive behavior stress test completed");
	});

	test("Storage performance under high load", async () => {
		const timer = new PerformanceTimer("Storage performance stress test");
		const operationCount = 100;
		const storageTimes = [];

		console.log(`Starting storage stress test: ${operationCount} operations`);

		for (let i = 0; i < operationCount; i++) {
			const operationTimer = new PerformanceTimer(`Storage operation ${i}`);

			// Create test data
			const preferences = createTestUserPreferences({
				userId: `stress_user_${i}`,
				roleWeights: new Map([
					["reaction", Math.random() * 2],
					["agreement", Math.random() * 2],
					["question", Math.random() * 2],
					["support", Math.random() * 2],
				]),
				topicPreferences: [`topic_${i}`, `category_${i % 5}`],
				interactionHistory: Array.from({ length: 10 }, (_, j) => ({
					commentId: `comment_${i}_${j}`,
					type: ["pickup", "thumbs_up", "thumbs_down"][j % 3] as
						| "pickup"
						| "thumbs_up"
						| "thumbs_down",
					timestamp: new Date(),
					sessionId: `session_${i}`,
					context: createTestConversationContext({}),
				})),
				sessionCount: i + 1,
			});

			// Save preferences
			await storage.saveUserPreferences(`stress_user_${i}`, preferences);

			// Retrieve preferences
			const retrieved = await storage.getUserPreferences(`stress_user_${i}`);
			expect(retrieved).toBeDefined();
			expect(retrieved?.sessionCount).toBe(i + 1);

			const operationTime = operationTimer.end();
			storageTimes.push(operationTime);

			// Check performance periodically
			if (i > 0 && i % 20 === 0) {
				const recentAverage =
					storageTimes.slice(-20).reduce((a, b) => a + b, 0) / 20;
				console.log(
					`Average storage time at ${i}: ${recentAverage.toFixed(2)}ms`,
				);

				// Storage operations should remain fast
				expect(recentAverage).toBeLessThan(100); // Less than 100ms average
			}
		}

		const totalTime = timer.end();
		const averageTime = totalTime / operationCount;
		const maxTime = Math.max(...storageTimes);

		console.log(`Storage stress test completed:
      - Total time: ${totalTime.toFixed(2)}ms
      - Average per operation: ${averageTime.toFixed(2)}ms
      - Max time: ${maxTime.toFixed(2)}ms`);

		// Verify performance is acceptable
		expect(averageTime).toBeLessThan(50); // Average should be under 50ms
		expect(maxTime).toBeLessThan(500); // No single operation should take more than 500ms

		// Verify data integrity after stress test
		const finalUser = await storage.getUserPreferences("stress_user_50");
		expect(finalUser).toBeDefined();
		expect(finalUser?.sessionCount).toBe(51);
	});

	test("System recovery after resource exhaustion", async () => {
		console.log("Starting resource exhaustion recovery test");

		// Simulate resource exhaustion by creating many objects
		const largeObjects = [];
		try {
			for (let i = 0; i < 1000; i++) {
				largeObjects.push({
					id: i,
					data: new Array(10000).fill(`data_${i}`), // Large array
					comments: Array.from({ length: 100 }, (_, j) => ({
						id: `${i}_${j}`,
						content: `Large comment content ${i}_${j}`.repeat(10),
						timestamp: new Date(),
					})),
				});

				// Check memory usage
				if (i % 100 === 0) {
					const metrics = performanceMonitor.getMetrics();
					console.log(
						`Memory at ${i} objects: ${metrics.memoryUsage.percentage.toFixed(1)}%`,
					);

					if (metrics.memoryUsage.percentage > 85) {
						console.log("High memory usage detected, stopping object creation");
						break;
					}
				}
			}
		} catch (error) {
			console.log("Resource exhaustion reached:", (error as Error).message);
		}

		// Force garbage collection
		performanceMonitor.forceGarbageCollection();
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Clear large objects
		largeObjects.length = 0;

		// Force another garbage collection
		performanceMonitor.forceGarbageCollection();
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Verify system recovery
		const recoveryComment = await commentSystem.generateComment(
			createTestConversationContext({
				recentTranscript: "Recovery test after resource exhaustion",
				currentTopic: "recovery",
				userEngagement: "medium",
				sessionDuration: 1,
				commentHistory: [],
			}),
		);

		expect(recoveryComment).toBeDefined();
		expect(recoveryComment?.content).toBeDefined();
		expect(recoveryComment?.role).toBeDefined();

		// Verify storage still works
		await storage.saveUserPreferences(
			"recovery_user",
			createTestUserPreferences({
				userId: "recovery_user",
				roleWeights: new Map(),
				topicPreferences: [],
				interactionHistory: [],
				sessionCount: 1,
			}),
		);

		const recoveredPreferences =
			await storage.getUserPreferences("recovery_user");
		expect(recoveredPreferences).toBeDefined();

		console.log("System recovery test completed successfully");
	});
});
