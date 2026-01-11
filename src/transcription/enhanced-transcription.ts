// Enhanced transcription implementation using Transformers.js Whisper models

import { pipeline } from "@huggingface/transformers";
import type {
	EnhancedTranscription,
	TranscriptionResult,
	WhisperModelInfo,
	WhisperSettings,
} from "../interfaces/enhanced-transcription";
import type { AudioFile, TranscriptSegment } from "../types/core";

interface WhisperResult {
	text: string;
	chunks?: Array<{
		timestamp?: [number, number];
		text: string;
	}>;
}

interface WhisperTranscriber {
	transcribe(audioData: Float32Array): Promise<unknown>;
}

export class WhisperTranscription implements EnhancedTranscription {
	private transcriber: WhisperTranscriber | null = null;
	private modelInfo: WhisperModelInfo;
	private settings: WhisperSettings;
	private isLoading = false;

	constructor(settings: Partial<WhisperSettings> = {}) {
		this.settings = {
			modelSize: "tiny",
			temperature: 0.0,
			beamSize: 1,
			...settings,
		};

		this.modelInfo = {
			name: `whisper-${this.settings.modelSize}`,
			size: this.settings.modelSize,
			languages: ["en", "ja", "es", "fr", "de", "it", "pt", "ru", "ko", "zh"],
			isLoaded: false,
			memoryUsage: 0,
		};
	}

	isAvailable(): boolean {
		// Check if the browser supports the required features
		return this.checkBrowserSupport();
	}

	async loadModel(): Promise<boolean> {
		if (this.isLoading) {
			return false;
		}

		if (this.transcriber && this.modelInfo.isLoaded) {
			return true;
		}

		try {
			this.isLoading = true;
			console.log(`Loading Whisper model: ${this.modelInfo.name}`);

			// Determine the model name based on size and language
			const modelName = this.getModelName();

			// Create the transcription pipeline
			this.transcriber = (await pipeline(
				"automatic-speech-recognition",
				modelName,
				{
					dtype: "q8", // Use quantized model for better performance in browser
					device: this.detectBestDevice(),
				},
			)) as WhisperTranscriber;

			this.modelInfo.isLoaded = true;
			this.modelInfo.memoryUsage = this.estimateMemoryUsage();

			console.log(`Whisper model loaded successfully: ${modelName}`);
			return true;
		} catch (error) {
			console.error("Failed to load Whisper model:", error);
			this.modelInfo.isLoaded = false;
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	async transcribeAudio(audioFile: AudioFile): Promise<TranscriptionResult> {
		if (!this.transcriber || !this.modelInfo.isLoaded) {
			const loaded = await this.loadModel();
			if (!loaded) {
				throw new Error("Failed to load Whisper model");
			}
		}

		try {
			const startTime = performance.now();

			// Convert AudioFile to the format expected by Transformers.js
			const audioData = await this.prepareAudioData(audioFile);

			// Perform transcription
			const result = await this.transcriber(audioData, {
				language: this.settings.language,
				temperature: this.settings.temperature,
				return_timestamps: true,
				chunk_length_s: 30, // Process in 30-second chunks
				stride_length_s: 5, // 5-second stride for better accuracy
			});

			const processingTime = performance.now() - startTime;

			// Convert the result to our TranscriptionResult format
			return this.formatTranscriptionResult(result, processingTime);
		} catch (error) {
			console.error("Transcription failed:", error);
			throw new Error(
				`Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	getModelInfo(): WhisperModelInfo {
		return { ...this.modelInfo };
	}

	configureModel(settings: WhisperSettings): void {
		const oldModelSize = this.settings.modelSize;
		this.settings = { ...settings };

		// If model size changed, we need to reload
		if (oldModelSize !== settings.modelSize) {
			this.modelInfo.name = `whisper-${settings.modelSize}`;
			this.modelInfo.size = settings.modelSize;
			this.modelInfo.isLoaded = false;
			this.transcriber = null;
		}
	}

	private checkBrowserSupport(): boolean {
		// Check for required browser features
		const hasWebAssembly = typeof WebAssembly !== "undefined";
		const hasArrayBuffer = typeof ArrayBuffer !== "undefined";
		const hasFloat32Array = typeof Float32Array !== "undefined";

		// Check for optional WebGPU support
		const hasWebGPU = "gpu" in navigator;

		if (!hasWebAssembly || !hasArrayBuffer || !hasFloat32Array) {
			console.warn("Browser lacks required features for Whisper transcription");
			return false;
		}

		if (!hasWebGPU) {
			console.info("WebGPU not available, will use CPU/WASM backend");
		}

		return true;
	}

	private detectBestDevice(): "webgpu" | "wasm" {
		// Try to use WebGPU if available, otherwise fall back to WASM
		if ("gpu" in navigator) {
			return "webgpu";
		}
		return "wasm";
	}

	private getModelName(): string {
		// Map our model sizes to Hugging Face model names
		const modelMap: Record<string, string> = {
			tiny: "Xenova/whisper-tiny",
			base: "Xenova/whisper-base",
			small: "Xenova/whisper-small",
			medium: "Xenova/whisper-medium",
			large: "Xenova/whisper-large-v2",
		};

		// For English-only models, use the .en variants for better performance
		if (this.settings.language === "en") {
			const englishModelMap: Record<string, string> = {
				tiny: "Xenova/whisper-tiny.en",
				base: "Xenova/whisper-base.en",
				small: "Xenova/whisper-small.en",
				medium: "Xenova/whisper-medium.en",
			};

			if (englishModelMap[this.settings.modelSize]) {
				return englishModelMap[this.settings.modelSize];
			}
		}

		return modelMap[this.settings.modelSize] || modelMap.tiny;
	}

	private estimateMemoryUsage(): number {
		// Rough memory usage estimates in MB for different model sizes
		const memoryEstimates: Record<string, number> = {
			tiny: 39,
			base: 74,
			small: 244,
			medium: 769,
			large: 1550,
		};

		return memoryEstimates[this.settings.modelSize] || memoryEstimates.tiny;
	}

	private async prepareAudioData(
		audioFile: AudioFile,
	): Promise<string | ArrayBuffer> {
		// For now, we'll assume the audioFile has a way to get the raw data
		// In a real implementation, this would convert the AudioFile to the appropriate format

		// If audioFile has a blob or buffer property, use that
		if ("blob" in audioFile && audioFile.blob instanceof Blob) {
			return audioFile.blob.arrayBuffer();
		}

		// If audioFile has a buffer property
		if ("buffer" in audioFile && audioFile.buffer instanceof ArrayBuffer) {
			return audioFile.buffer;
		}

		// If audioFile has a URL, we can use that directly
		if ("url" in audioFile && typeof audioFile.url === "string") {
			return audioFile.url;
		}

		throw new Error("AudioFile format not supported for transcription");
	}

	private formatTranscriptionResult(
		result: WhisperResult,
		processingTime: number,
	): TranscriptionResult {
		// Handle different result formats from Transformers.js
		let text = "";
		const confidence = 1.0;
		let segments: TranscriptSegment[] = [];
		let language = this.settings.language || "en";

		if (typeof result === "string") {
			text = result;
		} else if (result && typeof result === "object") {
			// Handle timestamped results
			if (result.text) {
				text = result.text;
			}

			if (result.chunks && Array.isArray(result.chunks)) {
				segments = result.chunks.map((chunk) => ({
					start: chunk.timestamp?.[0] || 0,
					end: chunk.timestamp?.[1] || 0,
					text: chunk.text || "",
					confidence: 1.0, // Transformers.js doesn't provide confidence scores
					isFinal: true,
				}));
			}

			// Extract language if detected
			if (result.language) {
				language = result.language;
			}
		}

		// If no segments were created but we have text, create a single segment
		if (segments.length === 0 && text) {
			segments = [
				{
					start: 0,
					end: 0,
					text: text,
					confidence: confidence,
					isFinal: true,
				},
			];
		}

		return {
			text: text.trim(),
			confidence,
			segments,
			language,
			processingTime,
		};
	}
}

// Device capability detection utility
export async function detectCapabilities(): Promise<{
	supportsWebGPU: boolean;
	supportsWebAssembly: boolean;
	estimatedMemory: number;
	recommendedModelSize: WhisperSettings["modelSize"];
}> {
	const supportsWebAssembly = typeof WebAssembly !== "undefined";
	const supportsWebGPU = "gpu" in navigator;

	// Estimate available memory (rough approximation)
	let estimatedMemory = 2048; // Default to 2GB

	if (
		"memory" in performance &&
		(performance as ExtendedPerformance).memory &&
		"usedJSHeapSize" in (performance as ExtendedPerformance).memory
	) {
		const memInfo = (performance as ExtendedPerformance).memory;
		estimatedMemory = Math.max(memInfo.jsHeapSizeLimit / (1024 * 1024), 1024);
	}

	// Recommend model size based on estimated memory
	let recommendedModelSize: WhisperSettings["modelSize"] = "tiny";
	if (estimatedMemory > 4096) {
		recommendedModelSize = "base";
	}
	if (estimatedMemory > 8192) {
		recommendedModelSize = "small";
	}

	return {
		supportsWebGPU,
		supportsWebAssembly,
		estimatedMemory,
		recommendedModelSize,
	};
}

export async function checkModelCompatibility(
	modelSize: WhisperSettings["modelSize"],
): Promise<boolean> {
	const capabilities = await detectCapabilities();

	const memoryRequirements: Record<WhisperSettings["modelSize"], number> = {
		tiny: 100,
		base: 200,
		small: 500,
		medium: 1000,
		large: 2000,
	};

	return capabilities.estimatedMemory >= memoryRequirements[modelSize];
}
