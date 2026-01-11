// Main entry point for MONOLOG LIVE

import VoiceChatIntegrationTest from "./integration-test.js";
import { IndexedDBWrapper } from "./storage/indexeddb-wrapper.js";

class MonologLive {
	private storage: IndexedDBWrapper;
	private integrationTest: VoiceChatIntegrationTest | null = null;

	constructor() {
		this.storage = new IndexedDBWrapper();
	}

	async initialize(): Promise<void> {
		try {
			await this.storage.initialize();
			this.updateStatus("System ready - Core interfaces loaded", "ready");
			console.log("MONOLOG LIVE initialized successfully");

			// Initialize integration test for checkpoint validation
			this.setupIntegrationTest();
		} catch (error) {
			this.updateStatus(`Initialization failed: ${error}`, "error");
			console.error("Failed to initialize MONOLOG LIVE:", error);
		}
	}

	private setupIntegrationTest(): void {
		try {
			this.integrationTest = new VoiceChatIntegrationTest();
			this.updateStatus(
				'Integration test ready - Click "Start Integration Test" to validate voice chat functionality',
				"ready",
			);
			console.log("Integration test initialized for checkpoint validation");
		} catch (error) {
			console.error("Failed to initialize integration test:", error);
			this.updateStatus("Integration test setup failed", "error");
		}
	}

	private updateStatus(message: string, type: "ready" | "error"): void {
		const statusElement = document.getElementById("status");
		if (statusElement) {
			statusElement.textContent = message;
			statusElement.className = type;
		}
	}

	// Public method to access integration test for external validation
	getIntegrationTest(): VoiceChatIntegrationTest | null {
		return this.integrationTest;
	}
}

// Initialize the application
const app = new MonologLive();
app.initialize();

// Make app globally available for testing
declare global {
	interface Window {
		monologLive: typeof app;
	}
}

(window as Window).monologLive = app;
