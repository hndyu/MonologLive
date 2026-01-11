// Unit tests for conversation starter system
// Tests Requirements 5.1, 5.3, 5.5

import {
	CONVERSATION_STARTERS,
	ConversationStarterGenerator,
	getTimeBasedGreeting,
	SESSION_GREETINGS,
} from "../src/comment-generation/conversation-starters";
import { TopicManager } from "../src/session/topic-manager";
import { TopicField } from "../src/ui/topic-field";

describe("Conversation Starters", () => {
	describe("ConversationStarterGenerator", () => {
		let generator: ConversationStarterGenerator;

		beforeEach(() => {
			generator = new ConversationStarterGenerator();
		});

		test("should generate session greeting with appropriate role", () => {
			// Requirement 5.2: Generate conversation starter comments
			const greeting = generator.generateSessionGreeting();

			expect(greeting.role).toBe("greeting");
			expect(greeting.content).toBeTruthy();
			expect(greeting.timestamp).toBeInstanceOf(Date);
			expect(greeting.context.currentTopic).toBe("session_start");
			expect(SESSION_GREETINGS).toContain(greeting.content);
		});

		test("should generate conversation starter without topic", () => {
			// Requirement 5.4: Generate appropriate starters when no topic specified
			const starter = generator.generateConversationStarter();

			expect(starter.role).toBe("question");
			expect(starter.content).toBeTruthy();
			expect(starter.timestamp).toBeInstanceOf(Date);
			expect(starter.context.currentTopic).toBe("general");
			expect(CONVERSATION_STARTERS.general).toContain(starter.content);
		});

		test("should generate topic-specific conversation starter", () => {
			// Requirement 5.3: Topic-based starter selection
			const foodStarter = generator.generateConversationStarter("食べ物");

			expect(foodStarter.role).toBe("question");
			expect(foodStarter.content).toBeTruthy();
			expect(foodStarter.context.currentTopic).toBe("食べ物");
			expect(CONVERSATION_STARTERS.food).toContain(foodStarter.content);
		});

		test("should map various topics to appropriate categories", () => {
			const testCases = [
				{ input: "アニメ", expectedCategory: "entertainment" },
				{ input: "仕事", expectedCategory: "work" },
				{ input: "天気", expectedCategory: "weather" },
				{ input: "休み", expectedCategory: "weekend" },
				{ input: "unknown_topic", expectedCategory: "general" },
			];

			testCases.forEach(({ input, expectedCategory }) => {
				const starter = generator.generateConversationStarter(input);
				const expectedStarters = CONVERSATION_STARTERS[expectedCategory];
				expect(expectedStarters).toContain(starter.content);
			});
		});

		test("should generate multiple starter options with variety", () => {
			// Requirement 5.4: Create variety in opening comments
			const starters = generator.generateStarterOptions("食べ物", 3);

			expect(starters).toHaveLength(3);
			expect(starters[0].role).toBe("greeting"); // First should be greeting
			expect(starters[1].role).toBe("question"); // Others should be questions
			expect(starters[2].role).toBe("question");

			// Should have different content
			const contents = starters.map((s) => s.content);
			expect(new Set(contents).size).toBe(3); // All unique
		});

		test("should avoid repeating recently used starters", () => {
			const usedStarters = new Set<string>();

			// Generate multiple starters and track uniqueness
			for (let i = 0; i < 10; i++) {
				const starter = generator.generateConversationStarter("general");
				usedStarters.add(starter.content);
			}

			// Should have generated some variety (at least 5 unique out of 10)
			expect(usedStarters.size).toBeGreaterThanOrEqual(5);
		});

		test("should generate follow-up starter after silence", () => {
			const followUp = generator.generateFollowUpStarter(20000); // 20 seconds

			expect(followUp).toBeTruthy();
			expect(followUp?.role).toBe("question");
			expect(followUp?.context.currentTopic).toBe("follow_up");
			expect(followUp?.context.detectedEmotion).toBe("concern");
			expect(followUp?.context.silenceDuration).toBe(20000);
		});

		test("should not generate follow-up for short silence", () => {
			const followUp = generator.generateFollowUpStarter(5000); // 5 seconds

			expect(followUp).toBeNull();
		});

		test("should reset used starters for new session", () => {
			// Generate some starters to populate used set
			generator.generateConversationStarter();
			generator.generateConversationStarter();

			const statsBefore = generator.getStats();
			expect(statsBefore.usedStartersCount).toBeGreaterThan(0);

			generator.resetForNewSession();

			const statsAfter = generator.getStats();
			expect(statsAfter.usedStartersCount).toBe(0);
		});
	});

	describe("Time-based greetings", () => {
		test("should return appropriate greeting for different times", () => {
			// Mock different times of day
			const originalDate = Date;

			// Morning (8 AM)
			global.Date = jest.fn(() => ({
				getHours: () => 8,
			})) as unknown as DateConstructor;
			expect(getTimeBasedGreeting()).toBe("おはよう〜");

			// Afternoon (2 PM)
			global.Date = jest.fn(() => ({
				getHours: () => 14,
			})) as unknown as DateConstructor;
			expect(getTimeBasedGreeting()).toBe("こんにちは！");

			// Evening (7 PM)
			global.Date = jest.fn(() => ({
				getHours: () => 19,
			})) as unknown as DateConstructor;
			expect(getTimeBasedGreeting()).toBe("こんばんは！");

			// Late night (1 AM)
			global.Date = jest.fn(() => ({
				getHours: () => 1,
			})) as unknown as DateConstructor;
			expect(getTimeBasedGreeting()).toBe("お疲れ様です！");

			// Restore original Date
			global.Date = originalDate;
		});
	});

	describe("Topic Manager Integration", () => {
		let topicManager: TopicManager;

		beforeEach(() => {
			topicManager = new TopicManager("test-session");
		});

		test("should generate starters based on current topic", () => {
			// Requirement 5.5: Topic influence on comment generation
			topicManager.setTopic("アニメ");

			const starters = topicManager.generateTopicBasedStarters(2);

			expect(starters).toHaveLength(2);
			expect(starters[0].role).toBe("greeting");
			expect(starters[1].context.currentTopic).toBe("アニメ");
		});

		test("should detect topic changes from speech", () => {
			const transcript =
				"アニメの話をしたいです。最近見た作品について。キャラクターが好きです。";
			const detectedTopic = topicManager.detectTopicFromSpeech(transcript);

			// Need multiple keywords to trigger detection
			expect(detectedTopic).toBe("アニメ");
		});

		test("should suggest topic changes when content shifts", () => {
			topicManager.setTopic("仕事");

			const transcript = "今日は美味しい料理を食べました。レストランで";
			const suggestion = topicManager.suggestTopicChange(transcript);

			expect(suggestion).toBe("食べ物");
		});

		test("should track topic progression", () => {
			topicManager.setTopic("ゲーム");
			topicManager.processSpeechInput("ゲームの話です");

			const progression = topicManager.getTopicProgression();
			expect(progression).toHaveLength(1);
			expect(progression[0].topic).toBe("ゲーム");
			expect(progression[0].commentCount).toBe(1);
		});

		test("should influence comment context based on topic", () => {
			topicManager.setTopic("音楽");

			const baseContext = {
				recentTranscript: "test",
				silenceDuration: 0,
				speechVolume: 0.5,
				detectedEmotion: "neutral",
			};

			const influencedContext =
				topicManager.influenceCommentContext(baseContext);

			expect(influencedContext.currentTopic).toBe("音楽");
			expect(influencedContext.detectedEmotion).toBe("enjoyment");
		});
	});

	describe("Topic Field UI", () => {
		let container: HTMLElement;
		let topicField: TopicField;
		let mockHandlers: {
			onTopicChange: jest.Mock;
			onTopicSubmit: jest.Mock;
			onTopicClear: jest.Mock;
		};

		beforeEach(() => {
			container = document.createElement("div");
			document.body.appendChild(container);

			mockHandlers = {
				onTopicChange: jest.fn(),
				onTopicSubmit: jest.fn(),
				onTopicClear: jest.fn(),
			};

			topicField = new TopicField(container, mockHandlers);
		});

		afterEach(() => {
			topicField.destroy();
			document.body.removeChild(container);
		});

		test("should create topic input field with proper structure", () => {
			// Requirement 5.1: Topic field UI component
			const input = container.querySelector(".topic-input") as HTMLInputElement;
			const label = container.querySelector(".topic-field-label");
			const clearBtn = container.querySelector(".topic-clear-btn");

			expect(input).toBeTruthy();
			expect(label).toBeTruthy();
			expect(clearBtn).toBeTruthy();
			expect(input.placeholder).toBe("セッションのトピック（任意）");
		});

		test("should handle topic input and notify handlers", () => {
			const input = container.querySelector(".topic-input") as HTMLInputElement;

			// Simulate user input
			input.value = "テストトピック";
			input.dispatchEvent(new Event("input"));

			expect(mockHandlers.onTopicChange).toHaveBeenCalledWith("テストトピック");
			expect(topicField.getCurrentTopic()).toBe("テストトピック");
		});

		test("should submit topic on Enter key", () => {
			const input = container.querySelector(".topic-input") as HTMLInputElement;

			input.value = "テストトピック";
			input.dispatchEvent(new Event("input"));

			// Simulate Enter key
			const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
			input.dispatchEvent(enterEvent);

			expect(mockHandlers.onTopicSubmit).toHaveBeenCalledWith("テストトピック");
		});

		test("should clear topic when clear button clicked", () => {
			const input = container.querySelector(".topic-input") as HTMLInputElement;
			const clearBtn = container.querySelector(
				".topic-clear-btn",
			) as HTMLButtonElement;

			// Set topic first
			input.value = "テストトピック";
			input.dispatchEvent(new Event("input"));

			// Click clear button
			clearBtn.click();

			expect(mockHandlers.onTopicClear).toHaveBeenCalled();
			expect(topicField.getCurrentTopic()).toBe("");
		});

		test("should show and hide suggestions appropriately", () => {
			const input = container.querySelector(".topic-input") as HTMLInputElement;
			const suggestions = container.querySelector(
				".topic-suggestions",
			) as HTMLElement;

			// Focus should show suggestions
			input.focus();
			expect(suggestions.style.display).toBe("block");

			// Blur should hide suggestions (with delay)
			input.blur();
			setTimeout(() => {
				expect(suggestions.style.display).toBe("none");
			}, 200);
		});

		test("should filter suggestions based on input", () => {
			const input = container.querySelector(".topic-input") as HTMLInputElement;

			// Type partial match
			input.value = "アニメ";
			input.dispatchEvent(new Event("input"));

			const suggestions = container.querySelectorAll(".topic-suggestion-item");
			const suggestionTexts = Array.from(suggestions).map((s) => s.textContent);

			expect(suggestionTexts.some((text) => text?.includes("アニメ"))).toBe(
				true,
			);
		});

		test("should handle topic selection from suggestions", () => {
			const input = container.querySelector(".topic-input") as HTMLInputElement;

			input.focus();

			const firstSuggestion = container.querySelector(
				".topic-suggestion-item",
			) as HTMLElement;
			const suggestionText = firstSuggestion.textContent || "";

			firstSuggestion.click();

			expect(topicField.getCurrentTopic()).toBe(suggestionText);
			expect(mockHandlers.onTopicChange).toHaveBeenCalledWith(suggestionText);
		});

		test("should validate topic length", () => {
			topicField.setTopic("a".repeat(50)); // Within limit
			expect(topicField.isValid()).toBe(true);

			topicField.setTopic("a".repeat(150)); // Exceeds limit
			expect(topicField.isValid()).toBe(false);
		});

		test("should show/hide field based on visibility setting", () => {
			expect(topicField.isTopicFieldVisible()).toBe(true);
			expect(container.style.display).not.toBe("none");

			topicField.setVisible(false);
			expect(topicField.isTopicFieldVisible()).toBe(false);
			expect(container.style.display).toBe("none");

			topicField.setVisible(true);
			expect(topicField.isTopicFieldVisible()).toBe(true);
			expect(container.style.display).toBe("flex");
		});
	});

	describe("Integration Tests", () => {
		test("should integrate topic field with topic manager", () => {
			// Requirement 5.1, 5.5: Integration between UI and management
			const container = document.createElement("div");
			document.body.appendChild(container);

			const topicManager = new TopicManager("test-session");
			let currentTopic = "";

			const handlers = {
				onTopicChange: (topic: string) => {
					currentTopic = topic;
					topicManager.setTopic(topic);
				},
				onTopicSubmit: (topic: string) => {
					topicManager.setTopic(topic);
				},
				onTopicClear: () => {
					topicManager.setTopic(null);
				},
			};

			const topicField = new TopicField(container, handlers);

			// Test topic setting
			topicField.setTopic("テスト統合");
			expect(currentTopic).toBe("テスト統合");
			expect(topicManager.getCurrentTopic()).toBe("テスト統合");

			// Test starter generation with topic
			const starters = topicManager.generateTopicBasedStarters(2);
			expect(starters).toHaveLength(2);
			expect(starters[1].context.currentTopic).toBe("テスト統合");

			// Cleanup
			topicField.destroy();
			document.body.removeChild(container);
		});

		test("should handle topic changes during conversation", () => {
			const topicManager = new TopicManager("test-session");

			// Start with one topic
			topicManager.setTopic("仕事");
			const starters = topicManager.generateTopicBasedStarters(1);
			// First starter is always a greeting with session_start context
			expect(starters[0].context.currentTopic).toBe("session_start");

			// Generate more starters to get topic-based ones
			const moreStarters = topicManager.generateTopicBasedStarters(2);
			expect(moreStarters[1].context.currentTopic).toBe("仕事");

			// Change topic
			topicManager.setTopic("食べ物");
			const newStarters = topicManager.generateTopicBasedStarters(2);
			expect(newStarters[1].context.currentTopic).toBe("食べ物");

			// Check history
			const history = topicManager.getTopicHistory();
			expect(history).toHaveLength(2);
			expect(history[0].newTopic).toBe("仕事");
			expect(history[1].newTopic).toBe("食べ物");
		});
	});
});
