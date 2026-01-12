// Specialized error handler for database operations
// Implements fallback mechanisms and mock switching (Requirements 6.1, 6.2)

import {
	createError,
	ErrorHandler,
	ErrorSeverity,
	ErrorType,
} from "./error-handler";

/**
 * Handles database-specific errors and provides recovery strategies
 */
export class DatabaseErrorHandler {
	private static instance: DatabaseErrorHandler;
	private useMockDatabase = false;

	private constructor() {}

	static getInstance(): DatabaseErrorHandler {
		if (!DatabaseErrorHandler.instance) {
			DatabaseErrorHandler.instance = new DatabaseErrorHandler();
		}
		return DatabaseErrorHandler.instance;
	}

	/**
	 * Handles a database initialization error
	 * @param error The original error
	 * @returns True if successfully handled (e.g. by falling back to mock)
	 */
	async handleInitializationError(error: Error): Promise<boolean> {
		console.warn(
			"Database initialization failed, attempting fallback to mock:",
			error.message,
		);

		const monologError = createError(
			ErrorType.STORAGE,
			ErrorSeverity.HIGH,
			"Database initialization failed. Switching to in-memory mock.",
			error,
			{ action: "fallback_to_mock" },
		);

		const strategy = await ErrorHandler.getInstance().handleError(monologError);

		if (strategy.canRecover) {
			this.useMockDatabase = true;
			return true;
		}

		return false;
	}

	/**
	 * Handles a database operation error
	 * @param operation Name of the failed operation
	 * @param error The original error
	 */
	async handleOperationError(operation: string, error: Error): Promise<void> {
		console.error(`Database operation '${operation}' failed:`, error.message);

		const monologError = createError(
			ErrorType.STORAGE,
			ErrorSeverity.MEDIUM,
			`Database operation failed: ${operation}`,
			error,
			{ operation },
		);

		await ErrorHandler.getInstance().handleError(monologError);
	}

	/**
	 * Checks if the system is currently using a mock database
	 */
	isUsingMock(): boolean {
		return this.useMockDatabase;
	}

	/**
	 * Resets the mock state (e.g. for retrying real database)
	 */
	resetState(): void {
		this.useMockDatabase = false;
	}
}

export const databaseErrorHandler = DatabaseErrorHandler.getInstance();
