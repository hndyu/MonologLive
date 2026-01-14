// Performance integration tests for MONOLOG LIVE

import { LazyLoader } from "../src/performance/lazy-loader";
import { PerformanceMonitor } from "../src/performance/performance-monitor";

describe("Performance Integration", () => {
	let monitor: PerformanceMonitor;
	let loader: LazyLoader;

	beforeEach(() => {
		// Mock performance.memory
		Object.defineProperty(performance, "memory", {
			value: {
				usedJSHeapSize: 50 * 1024 * 1024,
				totalJSHeapSize: 100 * 1024 * 1024,
				jsHeapSizeLimit: 200 * 1024 * 1024,
			},
			configurable: true,
			writable: true,
		});

		monitor = PerformanceMonitor.getInstance();
		loader = LazyLoader.getInstance();

		// Unload features to ensure clean state
		const status = loader.getFeatureStatus();
		for (const feature of status) {
			loader.unloadFeature(feature.name);
		}
	});

	test("PerformanceMonitor tracks memory metrics correctly", () => {
		// Manually trigger update for testing
		// @ts-expect-error - access private method for testing
		monitor.updateMetrics();

		const metrics = monitor.getMetrics();
		expect(metrics.memoryUsage.used).toBe(50 * 1024 * 1024);
		expect(metrics.memoryUsage.total).toBe(100 * 1024 * 1024);
		expect(metrics.memoryUsage.percentage).toBe(50);
	});

	test("PerformanceMonitor tracks initialization time", () => {
		monitor.recordResponseTime("initialization", 123.45);
		const metrics = monitor.getMetrics();
		expect(metrics.responseTime.initialization).toBe(123.45);
	});

	test("PerformanceMonitor triggers warnings when thresholds are exceeded", () => {
		const warningCallback = jest.fn();
		monitor.onPerformanceWarning(warningCallback);

		// Mock high memory usage
		Object.defineProperty(performance, "memory", {
			value: {
				usedJSHeapSize: 180 * 1024 * 1024,
				totalJSHeapSize: 200 * 1024 * 1024,
				jsHeapSizeLimit: 200 * 1024 * 1024,
			},
			configurable: true,
			writable: true,
		});

		// @ts-expect-error
		monitor.updateMetrics();
		// @ts-expect-error
		monitor.checkThresholds();

		expect(warningCallback).toHaveBeenCalled();
		expect(warningCallback.mock.calls[0][0]).toContain(
			"Critical memory usage detected",
		);
	});

	test("LazyLoader does not load features initially", () => {
		const status = loader.getFeatureStatus();
		for (const feature of status) {
			expect(feature.isLoaded).toBe(false);
		}
	});

	test("LazyLoader loads features on demand", async () => {
		// Mock a feature loader to avoid actual imports
		const mockResult = { test: "data" };
		const mockLoader = jest.fn().mockResolvedValue(mockResult);

		loader.registerFeature({
			name: "test-feature",
			isLoaded: false,
			isLoading: false,
			loader: mockLoader,
		});

		expect(loader.isFeatureLoaded("test-feature")).toBe(false);

		const result = await loader.loadFeature("test-feature");

		expect(result).toBe(mockResult);
		expect(loader.isFeatureLoaded("test-feature")).toBe(true);
		expect(mockLoader).toHaveBeenCalledTimes(1);
	});

	test("LazyLoader handles concurrent loading of the same feature", async () => {
		let resolveLoader: (value: unknown) => void;
		const loadingPromise = new Promise((resolve) => {
			resolveLoader = resolve;
		});

		const mockLoader = jest.fn().mockReturnValue(loadingPromise);

		loader.registerFeature({
			name: "concurrent-feature",
			isLoaded: false,
			isLoading: false,
			loader: mockLoader,
		});

		const p1 = loader.loadFeature("concurrent-feature");
		const p2 = loader.loadFeature("concurrent-feature");

		expect(loader.isFeatureLoading("concurrent-feature")).toBe(true);

		const mockResult = { success: true };
		// @ts-expect-error
		resolveLoader(mockResult);

		const [r1, r2] = await Promise.all([p1, p2]);

		expect(r1).toBe(mockResult);
		expect(r2).toBe(mockResult);
		expect(mockLoader).toHaveBeenCalledTimes(1);
	});

	test("LazyLoader handles dependencies correctly", async () => {
		const depLoader = jest.fn().mockResolvedValue({ dep: true });
		const mainLoader = jest.fn().mockResolvedValue({ main: true });

		loader.registerFeature({
			name: "dependency",
			isLoaded: false,
			isLoading: false,
			loader: depLoader,
		});

		loader.registerFeature({
			name: "main-feature",
			isLoaded: false,
			isLoading: false,
			loader: mainLoader,
			dependencies: ["dependency"],
		});

		await loader.loadFeature("main-feature");

		expect(depLoader).toHaveBeenCalled();
		expect(mainLoader).toHaveBeenCalled();
		expect(loader.isFeatureLoaded("dependency")).toBe(true);
		expect(loader.isFeatureLoaded("main-feature")).toBe(true);
	});

	test("LazyLoader handles loading errors and propagates them", async () => {
		const errorMessage = "Network failure while loading module";
		const mockLoader = jest.fn().mockRejectedValue(new Error(errorMessage));

		loader.registerFeature({
			name: "error-feature",
			isLoaded: false,
			isLoading: false,
			loader: mockLoader,
		});

		await expect(loader.loadFeature("error-feature")).rejects.toThrow(
			errorMessage,
		);
		expect(loader.isFeatureLoaded("error-feature")).toBe(false);
		expect(loader.isFeatureLoading("error-feature")).toBe(false);
	});
});
