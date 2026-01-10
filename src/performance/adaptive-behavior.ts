// Adaptive behavior system that adjusts based on performance

import { performanceMonitor, PerformanceMetrics } from './performance-monitor.js';
import { lazyLoader } from './lazy-loader.js';
import { offlineManager } from '../error-handling/offline-manager.js';

export interface AdaptiveConfig {
  llmUsageRatio: number; // 0-1, ratio of LLM vs rule-based comments
  commentFrequency: number; // Comments per minute
  transcriptionQuality: 'basic' | 'enhanced';
  audioRecordingEnabled: boolean;
  memoryOptimizationLevel: 'none' | 'moderate' | 'aggressive';
}

export class AdaptiveBehaviorManager {
  private static instance: AdaptiveBehaviorManager;
  private currentConfig: AdaptiveConfig;
  private baselineConfig: AdaptiveConfig;
  private adaptationCallbacks: ((config: AdaptiveConfig) => void)[] = [];

  private constructor() {
    this.baselineConfig = {
      llmUsageRatio: 0.3,
      commentFrequency: 15,
      transcriptionQuality: 'basic',
      audioRecordingEnabled: true,
      memoryOptimizationLevel: 'none'
    };
    this.currentConfig = { ...this.baselineConfig };
    this.setupPerformanceMonitoring();
  }

  static getInstance(): AdaptiveBehaviorManager {
    if (!AdaptiveBehaviorManager.instance) {
      AdaptiveBehaviorManager.instance = new AdaptiveBehaviorManager();
    }
    return AdaptiveBehaviorManager.instance;
  }

  private setupPerformanceMonitoring(): void {
    performanceMonitor.onPerformanceUpdate((metrics) => {
      this.adaptToPerformance(metrics);
    });

    performanceMonitor.onPerformanceWarning((warning, metrics) => {
      console.log('Performance warning:', warning);
      this.handlePerformanceWarning(warning, metrics);
    });

    // Monitor offline status changes
    offlineManager.onOffline(() => {
      this.adaptToOfflineMode();
    });

    offlineManager.onOnline(() => {
      this.adaptToOnlineMode();
    });
  }

  // Adapt configuration based on current performance metrics
  private adaptToPerformance(metrics: PerformanceMetrics): void {
    const newConfig = { ...this.currentConfig };
    let configChanged = false;

    // Adapt based on memory usage
    if (metrics.memoryUsage.percentage > 85) {
      // Critical memory usage - aggressive optimization
      if (newConfig.memoryOptimizationLevel !== 'aggressive') {
        newConfig.memoryOptimizationLevel = 'aggressive';
        newConfig.llmUsageRatio = Math.max(0.1, newConfig.llmUsageRatio * 0.5);
        newConfig.commentFrequency = Math.max(5, newConfig.commentFrequency * 0.7);
        newConfig.transcriptionQuality = 'basic';
        configChanged = true;
      }
    } else if (metrics.memoryUsage.percentage > 70) {
      // High memory usage - moderate optimization
      if (newConfig.memoryOptimizationLevel !== 'moderate') {
        newConfig.memoryOptimizationLevel = 'moderate';
        newConfig.llmUsageRatio = Math.max(0.2, newConfig.llmUsageRatio * 0.8);
        newConfig.commentFrequency = Math.max(8, newConfig.commentFrequency * 0.85);
        configChanged = true;
      }
    } else if (metrics.memoryUsage.percentage < 50) {
      // Low memory usage - can increase performance
      if (newConfig.memoryOptimizationLevel !== 'none') {
        newConfig.memoryOptimizationLevel = 'none';
        newConfig.llmUsageRatio = Math.min(this.baselineConfig.llmUsageRatio, newConfig.llmUsageRatio * 1.2);
        newConfig.commentFrequency = Math.min(this.baselineConfig.commentFrequency, newConfig.commentFrequency * 1.15);
        configChanged = true;
      }
    }

    // Adapt based on response times
    if (metrics.responseTime.commentGeneration > 1000) {
      // Slow comment generation - reduce LLM usage
      const newRatio = Math.max(0.1, newConfig.llmUsageRatio * 0.8);
      if (newRatio !== newConfig.llmUsageRatio) {
        newConfig.llmUsageRatio = newRatio;
        configChanged = true;
      }
    } else if (metrics.responseTime.commentGeneration < 200) {
      // Fast comment generation - can increase LLM usage
      const newRatio = Math.min(this.baselineConfig.llmUsageRatio, newConfig.llmUsageRatio * 1.1);
      if (newRatio !== newConfig.llmUsageRatio) {
        newConfig.llmUsageRatio = newRatio;
        configChanged = true;
      }
    }

    // Adapt transcription quality based on performance
    if (metrics.responseTime.transcription > 500 && newConfig.transcriptionQuality === 'enhanced') {
      newConfig.transcriptionQuality = 'basic';
      configChanged = true;
    }

    // Apply changes if configuration changed
    if (configChanged) {
      this.updateConfig(newConfig);
    }
  }

  private handlePerformanceWarning(warning: string, metrics: PerformanceMetrics): void {
    if (warning.includes('Critical memory')) {
      // Emergency memory optimization
      this.emergencyMemoryOptimization();
    } else if (warning.includes('Critical response time')) {
      // Emergency performance optimization
      this.emergencyPerformanceOptimization();
    }
  }

  private emergencyMemoryOptimization(): void {
    console.log('Applying emergency memory optimization');
    
    // Force garbage collection if available
    performanceMonitor.forceGarbageCollection();
    
    // Unload non-essential features
    if (lazyLoader.isFeatureLoaded('enhanced-transcription')) {
      lazyLoader.unloadFeature('enhanced-transcription');
    }
    
    // Reduce to minimal configuration
    this.updateConfig({
      llmUsageRatio: 0.05,
      commentFrequency: 5,
      transcriptionQuality: 'basic',
      audioRecordingEnabled: false,
      memoryOptimizationLevel: 'aggressive'
    });
  }

  private emergencyPerformanceOptimization(): void {
    console.log('Applying emergency performance optimization');
    
    // Switch to rule-based comments only
    this.updateConfig({
      ...this.currentConfig,
      llmUsageRatio: 0,
      commentFrequency: Math.max(3, this.currentConfig.commentFrequency * 0.5),
      transcriptionQuality: 'basic'
    });
  }

  private adaptToOfflineMode(): void {
    console.log('Adapting to offline mode');
    
    const offlineConfig: AdaptiveConfig = {
      llmUsageRatio: lazyLoader.isFeatureLoaded('webllm') ? 0.2 : 0,
      commentFrequency: 10,
      transcriptionQuality: 'basic',
      audioRecordingEnabled: offlineManager.isFeatureAvailable('audioRecording'),
      memoryOptimizationLevel: 'moderate'
    };
    
    this.updateConfig(offlineConfig);
  }

  private adaptToOnlineMode(): void {
    console.log('Adapting to online mode');
    
    // Gradually restore to baseline configuration
    this.updateConfig({ ...this.baselineConfig });
  }

  private updateConfig(newConfig: AdaptiveConfig): void {
    const oldConfig = { ...this.currentConfig };
    this.currentConfig = { ...newConfig };
    
    console.log('Configuration updated:', {
      old: oldConfig,
      new: newConfig
    });
    
    // Notify callbacks
    this.adaptationCallbacks.forEach(callback => {
      try {
        callback(this.currentConfig);
      } catch (error) {
        console.error('Error in adaptation callback:', error);
      }
    });
  }

  // Register callback for configuration changes
  onConfigurationChange(callback: (config: AdaptiveConfig) => void): void {
    this.adaptationCallbacks.push(callback);
  }

  // Get current configuration
  getCurrentConfig(): AdaptiveConfig {
    return { ...this.currentConfig };
  }

  // Get baseline configuration
  getBaselineConfig(): AdaptiveConfig {
    return { ...this.baselineConfig };
  }

  // Manually set configuration (for testing or user preferences)
  setConfig(config: Partial<AdaptiveConfig>): void {
    this.updateConfig({ ...this.currentConfig, ...config });
  }

  // Reset to baseline configuration
  resetToBaseline(): void {
    this.updateConfig({ ...this.baselineConfig });
  }

  // Get performance recommendations based on current state
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = performanceMonitor.getMetrics();
    
    if (metrics.memoryUsage.percentage > 70) {
      recommendations.push('High memory usage detected. Consider closing other browser tabs.');
      if (this.currentConfig.audioRecordingEnabled) {
        recommendations.push('Disable audio recording to reduce memory usage.');
      }
      if (this.currentConfig.transcriptionQuality === 'enhanced') {
        recommendations.push('Switch to basic transcription to improve performance.');
      }
    }
    
    if (metrics.responseTime.commentGeneration > 500) {
      recommendations.push('Slow comment generation. Reducing AI usage ratio.');
      recommendations.push('Consider using a more powerful device for better performance.');
    }
    
    if (offlineManager.getOfflineStatus()) {
      recommendations.push('Running in offline mode. Some features may be limited.');
    }
    
    return recommendations;
  }

  // Get optimization status
  getOptimizationStatus(): {
    level: string;
    activeOptimizations: string[];
    performanceGain: string;
  } {
    const optimizations: string[] = [];
    let performanceGain = 'None';
    
    if (this.currentConfig.memoryOptimizationLevel !== 'none') {
      optimizations.push(`Memory optimization: ${this.currentConfig.memoryOptimizationLevel}`);
    }
    
    if (this.currentConfig.llmUsageRatio < this.baselineConfig.llmUsageRatio) {
      optimizations.push('Reduced AI processing');
      performanceGain = 'Moderate';
    }
    
    if (this.currentConfig.commentFrequency < this.baselineConfig.commentFrequency) {
      optimizations.push('Reduced comment frequency');
    }
    
    if (this.currentConfig.transcriptionQuality === 'basic' && this.baselineConfig.transcriptionQuality === 'enhanced') {
      optimizations.push('Basic transcription mode');
    }
    
    if (!this.currentConfig.audioRecordingEnabled && this.baselineConfig.audioRecordingEnabled) {
      optimizations.push('Audio recording disabled');
      performanceGain = 'High';
    }
    
    return {
      level: this.currentConfig.memoryOptimizationLevel,
      activeOptimizations: optimizations,
      performanceGain
    };
  }
}

// Global adaptive behavior manager instance
export const adaptiveBehaviorManager = AdaptiveBehaviorManager.getInstance();