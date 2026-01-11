// WebLLM integration for local LLM processing
// Implements Requirements 2.4, 2.5, 2.6 for hybrid comment generation

import type {
	CommentRole,
	LocalLLMProcessor,
	ModelInfo,
} from "../interfaces/comment-generation";
import type { ConversationContext } from "../types/core";

// WebLLM types and imports
interface ChatOptions {
	temperature?: number;
	max_tokens?: number;
	top_p?: number;
}

interface ChatMessage {
	role: string;
	content: string;
}

interface GenerationConfig {
	temperature?: number;
	max_tokens?: number;
	top_p?: number;
}

interface ProgressInfo {
	progress: number;
	timeElapsed: number;
	text: string;
}

interface WebLLMEngine {
	reload(modelId: string, chatOpts?: ChatOptions): Promise<void>;
	chat(messages: ChatMessage[], genConfig?: GenerationConfig): Promise<string>;
	runtimeStatsText(): string;
	unload(): Promise<void>;
}

interface CreateWebLLMEngineOptions {
	initProgressCallback?: (progress: ProgressInfo) => void;
	logLevel?: string;
}

// Dynamic import function for WebLLM
async function createWebLLMEngine(
	options?: CreateWebLLMEngineOptions,
): Promise<WebLLMEngine> {
	try {
		const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
		return await CreateWebWorkerMLCEngine(options);
	} catch (error) {
		throw new Error(`Failed to load WebLLM: ${error}`);
	}
}

/**
 * WebLLM-based local LLM processor for comment generation
 * Provides fallback mechanisms and browser compatibility checks
 */
export class WebLLMProcessor implements LocalLLMProcessor {
	private engine: WebLLMEngine | null = null;
	private modelInfo: ModelInfo;
	private isInitializing = false;
	private initializationPromise: Promise<boolean> | null = null;

	// Lightweight models suitable for comment generation
	private readonly SUPPORTED_MODELS = [
		"Llama-3.2-1B-Instruct-q4f32_1-MLC",
		"Llama-3.2-3B-Instruct-q4f32_1-MLC",
		"Phi-3.5-mini-instruct-q4f16_1-MLC",
	];

	private readonly DEFAULT_MODEL = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

	constructor() {
		this.modelInfo = {
			name: this.DEFAULT_MODEL,
			size: "1B parameters",
			isLoaded: false,
			capabilities: ["text-generation", "conversation", "japanese-support"],
		};
	}

	/**
	 * Checks if WebLLM is available in the current browser environment
	 */
	isAvailable(): boolean {
		try {
			// Check for required browser features
			const hasWebAssembly = typeof WebAssembly !== "undefined";
			const hasWebWorkers = typeof Worker !== "undefined";
			const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";

			return hasWebAssembly && hasWebWorkers && hasSharedArrayBuffer;
		} catch (error) {
			console.warn("WebLLM availability check failed:", error);
			return false;
		}
	}

	/**
	 * Gets current model information
	 */
	getModelInfo(): ModelInfo {
		return { ...this.modelInfo };
	}

	/**
	 * Loads and initializes the WebLLM model
	 * Implements fallback mechanisms for unsupported browsers
	 */
	async loadModel(modelId?: string): Promise<boolean> {
		// Return existing initialization promise if already initializing
		if (this.isInitializing && this.initializationPromise) {
			return this.initializationPromise;
		}

		// Return true if already loaded
		if (this.engine && this.modelInfo.isLoaded) {
			return true;
		}

		this.isInitializing = true;

		this.initializationPromise = this._loadModelInternal(modelId);
		const result = await this.initializationPromise;

		this.isInitializing = false;
		this.initializationPromise = null;

		return result;
	}

	private async _loadModelInternal(modelId?: string): Promise<boolean> {
		try {
			// Check browser compatibility first
			if (!this.isAvailable()) {
				console.warn("WebLLM not available in this browser environment");
				return false;
			}

			const selectedModel = modelId || this.DEFAULT_MODEL;

			// Validate model selection
			if (!this.SUPPORTED_MODELS.includes(selectedModel)) {
				console.warn(
					`Unsupported model: ${selectedModel}, falling back to ${this.DEFAULT_MODEL}`,
				);
				modelId = this.DEFAULT_MODEL;
			}

			console.log(`Loading WebLLM model: ${selectedModel}`);

			// Create WebLLM engine with progress callback
			this.engine = await createWebLLMEngine({
				initProgressCallback: (progress) => {
					console.log("WebLLM loading progress:", progress);
				},
				logLevel: "INFO",
			});

			// Load the model
			await this.engine.reload(selectedModel);

			// Update model info
			this.modelInfo = {
				name: selectedModel,
				size: this.getModelSize(selectedModel),
				isLoaded: true,
				capabilities: ["text-generation", "conversation", "japanese-support"],
			};

			console.log(`WebLLM model loaded successfully: ${selectedModel}`);
			return true;
		} catch (error) {
			console.error("Failed to load WebLLM model:", error);
			this.modelInfo.isLoaded = false;
			this.engine = null;
			return false;
		}
	}

	/**
	 * Generates contextual comments using the loaded LLM
	 * Implements Requirements 2.4, 2.5, 2.6
	 */
	async generateContextualComment(
		context: ConversationContext,
		role: CommentRole,
	): Promise<string> {
		if (!this.engine || !this.modelInfo.isLoaded) {
			throw new Error("WebLLM model not loaded. Call loadModel() first.");
		}

		try {
			const prompt = this.createPrompt(context, role);

			const messages = [
				{
					role: "system",
					content:
						"You are generating live stream comments in Japanese. Keep responses short (1-10 words), natural, and appropriate for the given role. Respond only with the comment text, no explanations.",
				},
				{
					role: "user",
					content: prompt,
				},
			];

			// Generate comment with constraints for performance
			const response = await this.engine.chat(messages, {
				temperature: 0.8,
				max_tokens: 50,
				top_p: 0.9,
				frequency_penalty: 0.1,
			});

			// Clean and validate response
			const comment = this.cleanResponse(response);

			// Fallback to role patterns if response is invalid
			if (!comment || comment.length > 100) {
				return this.getFallbackComment(role);
			}

			return comment;
		} catch (error) {
			console.error("WebLLM comment generation failed:", error);
			return this.getFallbackComment(role);
		}
	}

	/**
	 * Creates contextual prompts for LLM comment generation
	 */
	private createPrompt(
		context: ConversationContext,
		role: CommentRole,
	): string {
		const { recentTranscript, currentTopic, emotionalTone } = context;

		let prompt = `Generate a ${role.type} comment for this live stream context:\n`;

		if (currentTopic) {
			prompt += `Topic: ${currentTopic}\n`;
		}

		if (recentTranscript) {
			prompt += `Recent speech: "${recentTranscript.slice(-200)}"\n`;
		}

		if (emotionalTone) {
			prompt += `Mood: ${emotionalTone}\n`;
		}

		// Add role-specific guidance
		switch (role.type) {
			case "greeting":
				prompt +=
					'Generate a welcoming greeting comment like "こんばんは！" or "初見です"';
				break;
			case "departure":
				prompt += 'Generate a goodbye comment like "おやすみ〜" or "お疲れ様"';
				break;
			case "reaction":
				prompt += 'Generate an emotional reaction like "かわいい" or "草"';
				break;
			case "agreement":
				prompt += 'Generate agreement like "たしかに" or "それな"';
				break;
			case "question":
				prompt += "Generate a casual question about daily life or interests";
				break;
			case "insider":
				prompt +=
					'Generate a regular viewer comment like "いつもの" or "出たｗ"';
				break;
			case "support":
				prompt +=
					'Generate supportive comment like "無理しないでね" or "応援してます"';
				break;
			case "playful":
				prompt +=
					'Generate playful teasing like "今の伏線？" or "台本ですか？"';
				break;
		}

		return prompt;
	}

	/**
	 * Cleans and validates LLM response
	 */
	private cleanResponse(response: string): string {
		return response
			.trim()
			.replace(/^["']|["']$/g, "") // Remove quotes
			.replace(/\n/g, " ") // Replace newlines with spaces
			.slice(0, 100); // Limit length
	}

	/**
	 * Provides fallback comments when LLM fails
	 */
	private getFallbackComment(role: CommentRole): string {
		const fallbacks = role.patterns.length > 0 ? role.patterns : ["..."];
		return fallbacks[Math.floor(Math.random() * fallbacks.length)];
	}

	/**
	 * Gets model size information
	 */
	private getModelSize(modelId: string): string {
		if (modelId.includes("1B")) return "1B parameters";
		if (modelId.includes("3B")) return "3B parameters";
		if (modelId.includes("mini")) return "3.8B parameters";
		return "Unknown size";
	}

	/**
	 * Gets runtime statistics from WebLLM
	 */
	getRuntimeStats(): string {
		if (!this.engine) return "Model not loaded";

		try {
			return this.engine.runtimeStatsText();
		} catch (error) {
			return `Stats unavailable: ${error}`;
		}
	}

	/**
	 * Unloads the model and frees resources
	 */
	async unload(): Promise<void> {
		if (this.engine) {
			try {
				await this.engine.unload();
			} catch (error) {
				console.error("Error unloading WebLLM model:", error);
			}

			this.engine = null;
			this.modelInfo.isLoaded = false;
		}
	}

	/**
	 * Checks if the processor is ready for generation
	 */
	isReady(): boolean {
		return this.engine !== null && this.modelInfo.isLoaded;
	}

	/**
	 * Gets available models
	 */
	getAvailableModels(): string[] {
		return [...this.SUPPORTED_MODELS];
	}

	/**
	 * Switches to a different model
	 */
	async switchModel(modelId: string): Promise<boolean> {
		if (this.engine) {
			await this.unload();
		}

		return this.loadModel(modelId);
	}
}
