import { MonologLiveApp } from "../src/main";
import type { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";

describe("Session Data Tracking - Integration Tests", () => {
	let app: MonologLiveApp;
	let mockRecognition: {
		start: jest.Mock;
		stop: jest.Mock;
		abort: jest.Mock;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SpeechRecognition event
		onresult: null | ((event: any) => void);
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SpeechRecognition error
		onerror: null | ((event: any) => void);
		onend: null | (() => void);
		onstart: null | (() => void);
	};
	let originalSpeechRecognition: unknown;

	beforeEach(async () => {
		// Mock DOM elements
		document.body.innerHTML = `
			<button id="start-btn"></button>
			<button id="stop-btn"></button>
			<button id="enhanced-transcribe-btn"></button>
			<button id="preferences-btn"></button>
			<button id="close-preferences"></button>
			<div id="preferences-modal"></div>
			<div id="transcription-area"></div>
			<div id="comment-mount"></div>
			<div id="topic-mount"></div>	
			<div id="preferences-mount"></div>
			<div id="status-indicator"></div>
			<div id="topic-field">
				<input type="text" id="topic-input" />
				<button id="update-topic-btn"></button>
			</div>
		`;

		// Mock SpeechRecognition
		mockRecognition = {
			start: jest.fn(),
			stop: jest.fn(),
			abort: jest.fn(),
			onresult: null,
			onerror: null,
			onend: null,
			onstart: null,
		};

		// biome-ignore lint/suspicious/noExplicitAny: Mocking global SpeechRecognition
		originalSpeechRecognition = (window as any).SpeechRecognition;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking global SpeechRecognition
		(window as any).SpeechRecognition = jest.fn(() => mockRecognition);
		// biome-ignore lint/suspicious/noExplicitAny: Mocking global SpeechRecognition
		(window as any).webkitSpeechRecognition = (window as any).SpeechRecognition;

		// Initialize app
		app = new MonologLiveApp();

		// Mock onTranscript before initialization to capture the callback
		// biome-ignore lint/suspicious/noExplicitAny: Accessing private voiceManager for testing
		jest.spyOn((app as any).voiceManager, "onTranscript");

		await app.initialize();
	});

	afterEach(async () => {
		// Restore original SpeechRecognition
		// biome-ignore lint/suspicious/noExplicitAny: Restoring global SpeechRecognition
		(window as any).SpeechRecognition = originalSpeechRecognition;
		// biome-ignore lint/suspicious/noExplicitAny: Restoring global SpeechRecognition
		(window as any).webkitSpeechRecognition = originalSpeechRecognition;

		// biome-ignore lint/suspicious/noExplicitAny: Accessing private storage for testing
		const storage = (app as any).storage as IndexedDBWrapper;
		await storage.clearAllData();
	});

	test("Should save transcript segments to SessionManager when onTranscript is called with isFinal=true", async () => {
		const sessionManager = app.getSessionManager();
		const trackActivitySpy = jest.spyOn(sessionManager, "trackActivity");

		// Start session and await its completion
		// biome-ignore lint/suspicious/noExplicitAny: Accessing private startSession for testing
		await (app as any).startSession();

		// biome-ignore lint/suspicious/noExplicitAny: Accessing private currentSessionId for testing
		const sessionId = (app as any).currentSessionId;
		expect(sessionId).toBeDefined();

		// Simulate voice transcript
		const testText = "Hello, this is a test transcript.";

		// Capture the callback passed to onTranscript
		// Since we want to test the integration in main.ts
		// biome-ignore lint/suspicious/noExplicitAny: Accessing private voiceManager for testing
		const voiceManager = (app as any).voiceManager;

		// Simulate a final transcript result
		// The callback is registered during initialize() in setupEventHandlers
		const onTranscriptCallback = (voiceManager.onTranscript as jest.Mock).mock
			.calls[0][0];

		await onTranscriptCallback(testText, true);

		// Verify trackActivity was called
		expect(trackActivitySpy).toHaveBeenCalledWith(
			sessionId,
			expect.objectContaining({
				type: "speech",
				data: expect.objectContaining({
					transcript: testText,
					isFinal: true,
				}),
			}),
		);
	});

	test("Should save generated comments to SessionManager when generateComment is called", async () => {
		const sessionManager = app.getSessionManager();
		const addCommentSpy = jest.spyOn(sessionManager, "addComment");

		// Start session and await its completion
		// biome-ignore lint/suspicious/noExplicitAny: Accessing private startSession for testing
		await (app as any).startSession();

		// biome-ignore lint/suspicious/noExplicitAny: Accessing private currentSessionId for testing
		const sessionId = (app as any).currentSessionId;
		expect(sessionId).toBeDefined();

		// Simulate voice transcript to trigger comment generation
		const testText = "Hello, I want to talk about something interesting.";

		// biome-ignore lint/suspicious/noExplicitAny: Accessing private voiceManager for testing
		const voiceManager = (app as any).voiceManager;
		const onTranscriptCallback = (voiceManager.onTranscript as jest.Mock).mock
			.calls[0][0];

		await onTranscriptCallback(testText, true);

		// Wait for any pending async operations (like comment generation)
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Verify addComment was called
		expect(addCommentSpy).toHaveBeenCalledWith(
			sessionId,
			expect.objectContaining({
				content: expect.any(String),
				timestamp: expect.any(Date),
			}),
		);
	});

	test("Should update TopicManager when TopicField triggers onTopicSubmit", async () => {
		const topicManager = app.getTopicManager();
		const testTopic = "Integrated Testing Topic";

		// TopicField creates its own elements inside topic-mount
		// We need to find the actual input element it created
		const topicMount = document.getElementById("topic-mount");
		const topicInput = topicMount?.querySelector(
			"input.topic-input",
		) as HTMLInputElement;

		if (topicInput) {
			topicInput.value = testTopic;

			// Trigger input event to update internal state
			topicInput.dispatchEvent(new Event("input", { bubbles: true }));

			// Simulate Enter key to trigger submitTopic()
			const event = new KeyboardEvent("keydown", {
				key: "Enter",
				code: "Enter",
				keyCode: 13,
				which: 13,
				bubbles: true,
			});
			topicInput.dispatchEvent(event);
		} else {
			throw new Error("Could not find topic input created by TopicField");
		}

		// Verify topicManager was updated
		expect(topicManager.getCurrentTopic()).toBe(testTopic);
	});
});
