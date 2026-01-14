import { errorHandler } from "../src/error-handling/index";
import { MonologLiveApp } from "../src/main";
import { IndexedDBWrapper } from "../src/storage/indexeddb-wrapper";
import { WebSpeechVoiceInputManager } from "../src/voice/voice-input-manager";

// Mock dependencies
jest.mock("../src/error-handling/index", () => ({
	errorHandler: {
		handleError: jest.fn().mockResolvedValue({
			canRecover: false,
			userMessage: "Mocked error message",
			retryable: false,
		}),
		getRecoveryStrategy: jest.fn().mockReturnValue({
			canRecover: false,
			userMessage: "Mocked recovery strategy",
			retryable: false,
		}),
		onError: jest.fn(),
	},
	errorUI: {
		showError: jest.fn(),
		showSystemStatus: jest.fn(),
		showLoading: jest.fn(),
		hideLoading: jest.fn(),
	},
	createError: jest
		.fn()
		.mockImplementation((type, severity, message, originalError) => ({
			type,
			severity,
			message,
			originalError,
			timestamp: new Date(),
		})),
	ErrorType: {
		VOICE_INPUT: "voice_input",
		AUDIO_RECORDING: "audio_recording",
		COMMENT_GENERATION: "comment_generation",
		LOCAL_LLM: "local_llm",
		STORAGE: "storage",
		SESSION: "session",
		TRANSCRIPTION: "transcription",
		NETWORK: "network",
		PERMISSION: "permission",
		BROWSER_COMPATIBILITY: "browser_compatibility",
	},
	ErrorSeverity: {
		LOW: "low",
		MEDIUM: "medium",
		HIGH: "high",
		CRITICAL: "critical",
	},
}));

jest.mock("../src/storage/indexeddb-wrapper");
jest.mock("../src/voice/voice-input-manager");

// Mock DOM elements required for initialization
document.body.innerHTML = `
  <div id="transcription-mount"></div>
  <div id="comment-mount"></div>
  <div id="topic-mount"></div>
  <div id="preferences-mount"></div>
  <div id="summary-mount"></div>
  <button id="start-btn"></button>
  <button id="stop-btn"></button>
  <button id="enhanced-transcribe-btn"></button>
  <button id="preferences-btn"></button>
  <button id="close-preferences"></button>
  <div id="preferences-modal"></div>
  <div id="status-text"></div>
  <div id="status-indicator"></div>
`;

describe("Error Handling Integration", () => {
	let app: MonologLiveApp;

	beforeEach(() => {
		jest.clearAllMocks();

		// Set default mock implementations that might have been changed in other tests
		(IndexedDBWrapper.prototype.initialize as jest.Mock).mockResolvedValue(
			undefined,
		);
		(
			WebSpeechVoiceInputManager.prototype.startListening as jest.Mock
		).mockImplementation(() => {});

		app = new MonologLiveApp();
	});

	it("should call errorHandler.handleError when initialize() fails", async () => {
		const mockError = new Error("Database initialization failed");
		(IndexedDBWrapper.prototype.initialize as jest.Mock).mockRejectedValue(
			mockError,
		);

		await app.initialize();

		expect(errorHandler.handleError).toHaveBeenCalled();
		const callArgs = (errorHandler.handleError as jest.Mock).mock.calls[0][0];
		expect(callArgs.type).toBe("storage");
	});

	it("should call errorHandler.handleError when startSession() fails", async () => {
		await app.initialize();

		const mockError = new Error("Voice input failed to start");
		(
			WebSpeechVoiceInputManager.prototype.startListening as jest.Mock
		).mockImplementation(() => {
			throw mockError;
		});

		// Clear mock calls from initialize()
		(errorHandler.handleError as jest.Mock).mockClear();

		// @ts-expect-error - access private method
		await app.startSession();

		expect(errorHandler.handleError).toHaveBeenCalled();
		const callArgs = (errorHandler.handleError as jest.Mock).mock.calls[0][0];
		expect(callArgs.type).toBe("voice_input");
	});

	it("should set up global error handlers during initialize", async () => {
		await app.initialize();

		// errorHandler.onError should be called for each ErrorType
		// There are 10 error types defined in ErrorType
		expect(errorHandler.onError).toHaveBeenCalled();
		expect(
			(errorHandler.onError as jest.Mock).mock.calls.length,
		).toBeGreaterThanOrEqual(10);
	});
});
