// Lazy loading system for optional features

interface ExtendedPerformance extends Performance {
	memory?: {
		usedJSHeapSize: number;
		totalJSHeapSize: number;
		jsHeapSizeLimit: number;
	};
}

export interface LazyLoadableFeature {
	name: string;
	isLoaded: boolean;
	isLoading: boolean;
	loader: () => Promise<unknown>;
	dependencies?: string[];
}

export class LazyLoader {
	private static instance: LazyLoader;
	private features: Map<string, LazyLoadableFeature> = new Map();
	private loadingPromises: Map<string, Promise<unknown>> = new Map();

	private constructor() {
		this.registerDefaultFeatures();
	}

	static getInstance(): LazyLoader {
		if (!LazyLoader.instance) {
			LazyLoader.instance = new LazyLoader();
		}
		return LazyLoader.instance;
	}

	private registerDefaultFeatures(): void {
		// Register WebLLM as lazy-loadable feature
		this.registerFeature({
			name: "webllm",
			isLoaded: false,
			isLoading: false,
			loader: async () => {
				const { WebLLMProcessor } = await import(
					"../comment-generation/webllm-processor.js"
				);
				return WebLLMProcessor;
			},
			dependencies: [],
		});

		// Register Enhanced Transcription as lazy-loadable feature
		this.registerFeature({
			name: "enhanced-transcription",
			isLoaded: false,
			isLoading: false,
			loader: async () => {
				const { WhisperTranscription } = await import(
					"../transcription/enhanced-transcription.js"
				);
				return WhisperTranscription;
			},
			dependencies: [],
		});

		// Register Audio Recording as lazy-loadable feature
		this.registerFeature({
			name: "audio-recording",
			isLoaded: false,
			isLoading: false,
			loader: async () => {
				const { WebAudioRecorder } = await import("../audio/audio-recorder.js");
				return WebAudioRecorder;
			},
			dependencies: [],
		});

		// Register Learning Module as lazy-loadable feature
		this.registerFeature({
			name: "learning-module",
			isLoaded: false,
			isLoading: false,
			loader: async () => {
				const { PreferenceLearning } = await import(
					"../learning/preference-learning.js"
				);
				return PreferenceLearning;
			},
			dependencies: [],
		});

		// Register Summary Generator as lazy-loadable feature
		this.registerFeature({
			name: "summary-generator",
			isLoaded: false,
			isLoading: false,
			loader: async () => {
				const { SummaryGeneratorImpl } = await import(
					"../summary/summary-generator.js"
				);
				return SummaryGeneratorImpl;
			},
			dependencies: [],
		});
	}

	// Register a new lazy-loadable feature
	registerFeature(feature: LazyLoadableFeature): void {
		this.features.set(feature.name, feature);
	}

	// Load a feature and its dependencies
	async loadFeature(featureName: string): Promise<unknown> {
		const feature = this.features.get(featureName);
		if (!feature) {
			throw new Error(`Feature '${featureName}' not registered`);
		}

		// Return cached result if already loaded
		if (feature.isLoaded) {
			return this.getCachedFeature(featureName);
		}

		// Return existing promise if already loading
		if (feature.isLoading) {
			const existingPromise = this.loadingPromises.get(featureName);
			if (existingPromise) {
				return existingPromise;
			}
		}

		// Load dependencies first
		if (feature.dependencies && feature.dependencies.length > 0) {
			await Promise.all(
				feature.dependencies.map((dep) => this.loadFeature(dep)),
			);
		}

		// Start loading
		feature.isLoading = true;
		const loadingPromise = this.performLoad(feature);
		this.loadingPromises.set(featureName, loadingPromise);

		try {
			const result = await loadingPromise;
			feature.isLoaded = true;
			feature.isLoading = false;
			this.loadingPromises.delete(featureName);
			console.log(`Feature '${featureName}' loaded successfully`);
			return result;
		} catch (error) {
			feature.isLoading = false;
			this.loadingPromises.delete(featureName);
			console.error(`Failed to load feature '${featureName}':`, error);
			throw error;
		}
	}

	private async performLoad(feature: LazyLoadableFeature): Promise<unknown> {
		const startTime = performance.now();
		try {
			const result = await feature.loader();
			const loadTime = performance.now() - startTime;
			console.log(
				`Feature '${feature.name}' loaded in ${loadTime.toFixed(2)}ms`,
			);
			return result;
		} catch (error) {
			const loadTime = performance.now() - startTime;
			console.error(
				`Feature '${feature.name}' failed to load after ${loadTime.toFixed(2)}ms:`,
				error,
			);
			throw error;
		}
	}

	// Check if a feature is loaded
	isFeatureLoaded(featureName: string): boolean {
		const feature = this.features.get(featureName);
		return feature ? feature.isLoaded : false;
	}

	// Check if a feature is currently loading
	isFeatureLoading(featureName: string): boolean {
		const feature = this.features.get(featureName);
		return feature ? feature.isLoading : false;
	}

	// Get cached feature result
	private getCachedFeature(featureName: string): unknown {
		// This would typically return the cached module/class instance
		// For now, we'll return a placeholder
		return { name: featureName, loaded: true };
	}

	// Preload features based on priority
	async preloadFeatures(
		featureNames: string[],
		priority: "high" | "medium" | "low" = "medium",
	): Promise<void> {
		const delay = priority === "high" ? 0 : priority === "medium" ? 100 : 500;

		for (const featureName of featureNames) {
			try {
				if (delay > 0) {
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
				await this.loadFeature(featureName);
			} catch (error) {
				console.warn(`Failed to preload feature '${featureName}':`, error);
				// Continue with other features
			}
		}
	}

	// Load features conditionally based on device capabilities
	async loadFeaturesConditionally(): Promise<void> {
		const capabilities = this.assessDeviceCapabilities();

		// Always load basic features
		const basicFeatures = ["learning-module"];
		await this.preloadFeatures(basicFeatures, "high");

		// Load advanced features based on capabilities
		if (capabilities.canHandleLocalLLM) {
			await this.loadFeature("webllm").catch((error) => {
				console.warn(
					"WebLLM not available, continuing without local LLM:",
					error,
				);
			});
		}

		if (capabilities.canHandleAudioRecording) {
			await this.loadFeature("audio-recording").catch((error) => {
				console.warn("Audio recording not available:", error);
			});
		}

		// Only load enhanced transcription if capability exists AND user has preloading enabled
		const preloadEnabled =
			localStorage.getItem("WHISPER_PRELOAD_ENABLED") === "true";

		if (capabilities.canHandleEnhancedTranscription && preloadEnabled) {
			await this.loadFeature("enhanced-transcription").catch((error) => {
				console.warn("Enhanced transcription preload failed:", error);
			});
		}

		// Always try to load summary generator
		await this.loadFeature("summary-generator").catch((error) => {
			console.warn("Summary generator not available:", error);
		});
	}

	private assessDeviceCapabilities(): {
		canHandleLocalLLM: boolean;
		canHandleAudioRecording: boolean;
		canHandleEnhancedTranscription: boolean;
	} {
		// Assess memory
		const hasEnoughMemory = this.hasEnoughMemory();

		// Assess WebAssembly support
		const hasWebAssembly = typeof WebAssembly !== "undefined";

		// Assess MediaRecorder support
		const hasMediaRecorder = typeof MediaRecorder !== "undefined";

		// Assess WebWorker support
		const hasWebWorkers = typeof Worker !== "undefined";

		return {
			canHandleLocalLLM: hasEnoughMemory && hasWebAssembly && hasWebWorkers,
			canHandleAudioRecording: hasMediaRecorder,
			canHandleEnhancedTranscription:
				hasEnoughMemory && hasWebAssembly && hasWebWorkers,
		};
	}

	private hasEnoughMemory(): boolean {
		if ("memory" in performance) {
			const memory = (performance as ExtendedPerformance).memory;
			if (memory) {
				// Require at least 100MB available memory for advanced features
				const availableMemory = memory.jsHeapSizeLimit - memory.usedJSHeapSize;
				return availableMemory > 100 * 1024 * 1024; // 100MB
			}
		}

		// Assume sufficient memory if we can't measure it
		return true;
	}

	// Get loading status of all features
	getFeatureStatus(): {
		name: string;
		isLoaded: boolean;
		isLoading: boolean;
	}[] {
		return Array.from(this.features.entries()).map(([name, feature]) => ({
			name,
			isLoaded: feature.isLoaded,
			isLoading: feature.isLoading,
		}));
	}

	// Unload a feature to free memory
	unloadFeature(featureName: string): void {
		const feature = this.features.get(featureName);
		if (feature) {
			feature.isLoaded = false;
			feature.isLoading = false;
			this.loadingPromises.delete(featureName);
			console.log(`Feature '${featureName}' unloaded`);
		}
	}

	// Get memory usage estimate for loaded features
	getMemoryUsageEstimate(): { feature: string; estimatedMB: number }[] {
		const estimates = [
			{ feature: "webllm", estimatedMB: 50 },
			{ feature: "enhanced-transcription", estimatedMB: 30 },
			{ feature: "audio-recording", estimatedMB: 5 },
			{ feature: "learning-module", estimatedMB: 2 },
			{ feature: "summary-generator", estimatedMB: 3 },
		];

		return estimates.filter((estimate) =>
			this.isFeatureLoaded(estimate.feature),
		);
	}
}

// Global lazy loader instance
export const lazyLoader = LazyLoader.getInstance();
