// Comprehensive error handling system for MONOLOG LIVE

export enum ErrorType {
	VOICE_INPUT = "voice_input",
	AUDIO_RECORDING = "audio_recording",
	COMMENT_GENERATION = "comment_generation",
	LOCAL_LLM = "local_llm",
	STORAGE = "storage",
	SESSION = "session",
	TRANSCRIPTION = "transcription",
	NETWORK = "network",
	PERMISSION = "permission",
	BROWSER_COMPATIBILITY = "browser_compatibility",
}

export enum ErrorSeverity {
	LOW = "low",
	MEDIUM = "medium",
	HIGH = "high",
	CRITICAL = "critical",
}

export interface MonologError {
	type: ErrorType;
	severity: ErrorSeverity;
	message: string;
	originalError?: Error;
	timestamp: Date;
	context?: Record<string, unknown>;
	recoveryAction?: string;
}

export interface ErrorRecoveryStrategy {
	canRecover: boolean;
	fallbackAction?: () => Promise<void>;
	userMessage: string;
	retryable: boolean;
}

export class ErrorHandler {
	private static instance: ErrorHandler;
	private errorLog: MonologError[] = [];
	private maxLogSize = 100;
	private errorCallbacks: Map<ErrorType, ((error: MonologError) => void)[]> =
		new Map();

	private constructor() {}

	static getInstance(): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler();
		}
		return ErrorHandler.instance;
	}

	// Register error callback for specific error types
	onError(type: ErrorType, callback: (error: MonologError) => void): void {
		if (!this.errorCallbacks.has(type)) {
			this.errorCallbacks.set(type, []);
		}
		this.errorCallbacks.get(type).push(callback);
	}

	// Handle error with recovery strategy
	async handleError(error: MonologError): Promise<ErrorRecoveryStrategy> {
		// Log the error
		this.logError(error);

		// Notify callbacks
		const callbacks = this.errorCallbacks.get(error.type) || [];
		callbacks.forEach((callback) => {
			try {
				callback(error);
			} catch (callbackError) {
				console.error("Error in error callback:", callbackError);
			}
		});

		// Determine recovery strategy
		const strategy = this.getRecoveryStrategy(error);

		// Execute fallback if available
		if (strategy.canRecover && strategy.fallbackAction) {
			try {
				await strategy.fallbackAction();
			} catch (fallbackError) {
				console.error("Fallback action failed:", fallbackError);
				return {
					canRecover: false,
					userMessage: "System recovery failed. Please refresh the page.",
					retryable: false,
				};
			}
		}

		return strategy;
	}

	private logError(error: MonologError): void {
		this.errorLog.push(error);

		// Keep log size manageable
		if (this.errorLog.length > this.maxLogSize) {
			this.errorLog.shift();
		}

		// Console logging based on severity
		const logMessage = `[${error.type}] ${error.message}`;
		switch (error.severity) {
			case ErrorSeverity.CRITICAL:
				console.error(logMessage, error.originalError);
				break;
			case ErrorSeverity.HIGH:
				console.error(logMessage, error.originalError);
				break;
			case ErrorSeverity.MEDIUM:
				console.warn(logMessage, error.originalError);
				break;
			case ErrorSeverity.LOW:
				console.info(logMessage, error.originalError);
				break;
		}
	}

	private getRecoveryStrategy(error: MonologError): ErrorRecoveryStrategy {
		switch (error.type) {
			case ErrorType.VOICE_INPUT:
				return this.getVoiceInputRecovery(error);
			case ErrorType.AUDIO_RECORDING:
				return this.getAudioRecordingRecovery(error);
			case ErrorType.COMMENT_GENERATION:
				return this.getCommentGenerationRecovery(error);
			case ErrorType.LOCAL_LLM:
				return this.getLocalLLMRecovery(error);
			case ErrorType.STORAGE:
				return this.getStorageRecovery(error);
			case ErrorType.SESSION:
				return this.getSessionRecovery(error);
			case ErrorType.TRANSCRIPTION:
				return this.getTranscriptionRecovery(error);
			case ErrorType.NETWORK:
				return this.getNetworkRecovery(error);
			case ErrorType.PERMISSION:
				return this.getPermissionRecovery(error);
			case ErrorType.BROWSER_COMPATIBILITY:
				return this.getBrowserCompatibilityRecovery(error);
			default:
				return {
					canRecover: false,
					userMessage: "An unexpected error occurred. Please try again.",
					retryable: true,
				};
		}
	}

	private getVoiceInputRecovery(_error: MonologError): ErrorRecoveryStrategy {
		return {
			canRecover: true,
			fallbackAction: async () => {
				// Attempt to restart voice recognition
				console.log("Attempting to restart voice recognition...");
			},
			userMessage:
				"Voice input temporarily unavailable. Attempting to reconnect...",
			retryable: true,
		};
	}

	private getAudioRecordingRecovery(
		_error: MonologError,
	): ErrorRecoveryStrategy {
		return {
			canRecover: true,
			fallbackAction: async () => {
				// Continue session without recording
				console.log("Continuing session without audio recording...");
			},
			userMessage:
				"Audio recording disabled. Session will continue without recording.",
			retryable: false,
		};
	}

	private getCommentGenerationRecovery(
		_error: MonologError,
	): ErrorRecoveryStrategy {
		return {
			canRecover: true,
			fallbackAction: async () => {
				// Fall back to basic rule-based comments
				console.log("Falling back to basic comment generation...");
			},
			userMessage:
				"Comment generation temporarily limited. Basic comments available.",
			retryable: true,
		};
	}

	private getLocalLLMRecovery(_error: MonologError): ErrorRecoveryStrategy {
		return {
			canRecover: true,
			fallbackAction: async () => {
				// Use rule-based generation only
				console.log("Using rule-based comment generation only...");
			},
			userMessage:
				"AI features temporarily unavailable. Using basic comment generation.",
			retryable: false,
		};
	}

	private getStorageRecovery(_error: MonologError): ErrorRecoveryStrategy {
		return {
			canRecover: true,
			fallbackAction: async () => {
				// Use in-memory storage
				console.log("Using temporary in-memory storage...");
			},
			userMessage:
				"Storage temporarily unavailable. Session data will not be saved.",
			retryable: true,
		};
	}

	private getSessionRecovery(_error: MonologError): ErrorRecoveryStrategy {
		return {
			canRecover: true,
			fallbackAction: async () => {
				// Create new session
				console.log("Creating new session...");
			},
			userMessage: "Session error occurred. Starting new session.",
			retryable: false,
		};
	}

	private getTranscriptionRecovery(
		_error: MonologError,
	): ErrorRecoveryStrategy {
		return {
			canRecover: true,
			fallbackAction: async () => {
				// Fall back to Web Speech API
				console.log("Falling back to Web Speech API...");
			},
			userMessage:
				"Enhanced transcription unavailable. Using standard transcription.",
			retryable: false,
		};
	}

	private getNetworkRecovery(_error: MonologError): ErrorRecoveryStrategy {
		return {
			canRecover: true,
			fallbackAction: async () => {
				// Enable offline mode
				console.log("Enabling offline mode...");
			},
			userMessage:
				"Network unavailable. Running in offline mode with limited features.",
			retryable: true,
		};
	}

	private getPermissionRecovery(_error: MonologError): ErrorRecoveryStrategy {
		return {
			canRecover: false,
			userMessage:
				"Microphone permission required. Please enable microphone access and refresh.",
			retryable: false,
		};
	}

	private getBrowserCompatibilityRecovery(
		_error: MonologError,
	): ErrorRecoveryStrategy {
		return {
			canRecover: false,
			userMessage:
				"Your browser does not support required features. Please use a modern browser.",
			retryable: false,
		};
	}

	// Get error statistics
	getErrorStats(): { type: ErrorType; count: number; lastOccurrence: Date }[] {
		const stats = new Map<ErrorType, { count: number; lastOccurrence: Date }>();

		this.errorLog.forEach((error) => {
			const existing = stats.get(error.type);
			if (existing) {
				existing.count++;
				if (error.timestamp > existing.lastOccurrence) {
					existing.lastOccurrence = error.timestamp;
				}
			} else {
				stats.set(error.type, { count: 1, lastOccurrence: error.timestamp });
			}
		});

		return Array.from(stats.entries()).map(([type, data]) => ({
			type,
			count: data.count,
			lastOccurrence: data.lastOccurrence,
		}));
	}

	// Clear error log
	clearErrorLog(): void {
		this.errorLog = [];
	}

	// Get recent errors
	getRecentErrors(limit: number = 10): MonologError[] {
		return this.errorLog.slice(-limit);
	}
}

// Utility function to create standardized errors
export function createError(
	type: ErrorType,
	severity: ErrorSeverity,
	message: string,
	originalError?: Error,
	context?: Record<string, unknown>,
	recoveryAction?: string,
): MonologError {
	return {
		type,
		severity,
		message,
		originalError,
		timestamp: new Date(),
		context,
		recoveryAction,
	};
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();
