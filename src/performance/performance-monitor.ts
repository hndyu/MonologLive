// Performance monitoring and optimization system

export interface PerformanceMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  responseTime: {
    voiceInput: number;
    commentGeneration: number;
    transcription: number;
  };
  resourceLoading: {
    localLLM: number;
    whisperModel: number;
  };
  sessionMetrics: {
    duration: number;
    commentsGenerated: number;
    transcriptionAccuracy: number;
  };
}

export interface PerformanceThresholds {
  memoryWarning: number; // Percentage
  memoryCritical: number; // Percentage
  responseTimeWarning: number; // Milliseconds
  responseTimeCritical: number; // Milliseconds
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private monitoringInterval: number | null = null;
  private performanceCallbacks: ((metrics: PerformanceMetrics) => void)[] = [];
  private warningCallbacks: ((warning: string, metrics: PerformanceMetrics) => void)[] = [];

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.thresholds = {
      memoryWarning: 70,
      memoryCritical: 85,
      responseTimeWarning: 500,
      responseTimeCritical: 1000
    };
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      memoryUsage: { used: 0, total: 0, percentage: 0 },
      cpuUsage: 0,
      responseTime: {
        voiceInput: 0,
        commentGeneration: 0,
        transcription: 0
      },
      resourceLoading: {
        localLLM: 0,
        whisperModel: 0
      },
      sessionMetrics: {
        duration: 0,
        commentsGenerated: 0,
        transcriptionAccuracy: 0
      }
    };
  }

  // Start performance monitoring
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = window.setInterval(() => {
      this.updateMetrics();
      this.checkThresholds();
      this.notifyCallbacks();
    }, intervalMs);

    console.log('Performance monitoring started');
  }

  // Stop performance monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Performance monitoring stopped');
    }
  }

  // Register callback for performance updates
  onPerformanceUpdate(callback: (metrics: PerformanceMetrics) => void): void {
    this.performanceCallbacks.push(callback);
  }

  // Register callback for performance warnings
  onPerformanceWarning(callback: (warning: string, metrics: PerformanceMetrics) => void): void {
    this.warningCallbacks.push(callback);
  }

  // Update performance metrics
  private updateMetrics(): void {
    this.updateMemoryUsage();
    this.updateCPUUsage();
  }

  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }
  }

  private updateCPUUsage(): void {
    // Estimate CPU usage based on frame timing
    const start = performance.now();
    requestAnimationFrame(() => {
      const duration = performance.now() - start;
      // Simple heuristic: longer frame times indicate higher CPU usage
      this.metrics.cpuUsage = Math.min(duration / 16.67 * 100, 100); // 16.67ms = 60fps
    });
  }

  // Record response time for specific operations
  recordResponseTime(operation: keyof PerformanceMetrics['responseTime'], duration: number): void {
    this.metrics.responseTime[operation] = duration;
  }

  // Record resource loading time
  recordResourceLoading(resource: keyof PerformanceMetrics['resourceLoading'], duration: number): void {
    this.metrics.resourceLoading[resource] = duration;
  }

  // Update session metrics
  updateSessionMetrics(updates: Partial<PerformanceMetrics['sessionMetrics']>): void {
    this.metrics.sessionMetrics = { ...this.metrics.sessionMetrics, ...updates };
  }

  // Check performance thresholds and trigger warnings
  private checkThresholds(): void {
    const { memoryUsage, responseTime } = this.metrics;

    // Memory warnings
    if (memoryUsage.percentage > this.thresholds.memoryCritical) {
      this.triggerWarning('Critical memory usage detected', this.metrics);
    } else if (memoryUsage.percentage > this.thresholds.memoryWarning) {
      this.triggerWarning('High memory usage detected', this.metrics);
    }

    // Response time warnings
    Object.entries(responseTime).forEach(([operation, time]) => {
      if (time > this.thresholds.responseTimeCritical) {
        this.triggerWarning(`Critical response time for ${operation}`, this.metrics);
      } else if (time > this.thresholds.responseTimeWarning) {
        this.triggerWarning(`Slow response time for ${operation}`, this.metrics);
      }
    });
  }

  private triggerWarning(warning: string, metrics: PerformanceMetrics): void {
    this.warningCallbacks.forEach(callback => {
      try {
        callback(warning, metrics);
      } catch (error) {
        console.error('Error in performance warning callback:', error);
      }
    });
  }

  private notifyCallbacks(): void {
    this.performanceCallbacks.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.error('Error in performance callback:', error);
      }
    });
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get performance recommendations
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const { memoryUsage, responseTime } = this.metrics;

    if (memoryUsage.percentage > this.thresholds.memoryWarning) {
      recommendations.push('Consider reducing memory usage by clearing unused data');
      recommendations.push('Disable optional features if memory is critical');
    }

    if (responseTime.commentGeneration > this.thresholds.responseTimeWarning) {
      recommendations.push('Consider reducing LLM usage ratio for faster comment generation');
    }

    if (responseTime.transcription > this.thresholds.responseTimeWarning) {
      recommendations.push('Consider using Web Speech API instead of enhanced transcription');
    }

    if (responseTime.voiceInput > this.thresholds.responseTimeWarning) {
      recommendations.push('Check microphone settings and browser performance');
    }

    return recommendations;
  }

  // Force garbage collection if available
  forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      console.log('Forced garbage collection');
    }
  }

  // Get memory usage summary
  getMemorySummary(): string {
    const { memoryUsage } = this.metrics;
    const usedMB = (memoryUsage.used / 1024 / 1024).toFixed(1);
    const totalMB = (memoryUsage.total / 1024 / 1024).toFixed(1);
    return `Memory: ${usedMB}MB / ${totalMB}MB (${memoryUsage.percentage.toFixed(1)}%)`;
  }
}

// Utility class for measuring operation performance
export class PerformanceTimer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    console.log(`${this.operation} took ${duration.toFixed(2)}ms`);
    return duration;
  }

  endAndRecord(monitor: PerformanceMonitor, operation: keyof PerformanceMetrics['responseTime']): number {
    const duration = this.end();
    monitor.recordResponseTime(operation, duration);
    return duration;
  }
}

// Global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();