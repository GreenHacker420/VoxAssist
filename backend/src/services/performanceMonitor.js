const logger = require('../utils/logger');

/**
 * Performance monitoring service for voice conversation pipeline
 * Tracks timing metrics for optimization analysis
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map(); // callId -> metrics
    this.globalStats = {
      totalRequests: 0,
      averageResponseTime: 0,
      bottlenecks: new Map()
    };
  }

  /**
   * Start timing for a specific operation
   */
  startTiming(callId, operation) {
    if (!this.metrics.has(callId)) {
      this.metrics.set(callId, {
        callId,
        startTime: Date.now(),
        operations: new Map(),
        totalResponseTime: 0,
        completed: false
      });
    }

    const metrics = this.metrics.get(callId);
    metrics.operations.set(operation, {
      startTime: Date.now(),
      endTime: null,
      duration: null
    });

    logger.info(`⏱️ Started timing ${operation} for call ${callId}`);
  }

  /**
   * End timing for a specific operation
   */
  endTiming(callId, operation, metadata = {}) {
    const metrics = this.metrics.get(callId);
    if (!metrics || !metrics.operations.has(operation)) {
      logger.warn(`No timing started for ${operation} in call ${callId}`);
      return;
    }

    const operationMetrics = metrics.operations.get(operation);
    operationMetrics.endTime = Date.now();
    operationMetrics.duration = operationMetrics.endTime - operationMetrics.startTime;
    operationMetrics.metadata = metadata;

    logger.info(`⏱️ Completed ${operation} for call ${callId} in ${operationMetrics.duration}ms`, metadata);

    // Update global bottleneck tracking
    this.updateBottleneckStats(operation, operationMetrics.duration);

    return operationMetrics.duration;
  }

  /**
   * Complete the full conversation cycle timing
   */
  completeConversationCycle(callId) {
    const metrics = this.metrics.get(callId);
    if (!metrics) return;

    metrics.totalResponseTime = Date.now() - metrics.startTime;
    metrics.completed = true;

    // Calculate breakdown
    const breakdown = this.calculateBreakdown(metrics);
    
    logger.info(`🎯 Complete conversation cycle for call ${callId}:`, {
      totalTime: metrics.totalResponseTime,
      breakdown,
      target: '< 2000ms',
      status: metrics.totalResponseTime < 2000 ? '✅ FAST' : '⚠️ SLOW'
    });

    // Update global stats
    this.updateGlobalStats(metrics);

    return {
      callId,
      totalTime: metrics.totalResponseTime,
      breakdown,
      isOptimal: metrics.totalResponseTime < 2000
    };
  }

  /**
   * Calculate timing breakdown for a conversation
   */
  calculateBreakdown(metrics) {
    const breakdown = {};
    const operations = metrics.operations;

    // Standard pipeline operations
    const pipelineOps = [
      'speech_to_text',
      'ai_processing', 
      'text_to_speech',
      'audio_transmission',
      'audio_playback'
    ];

    pipelineOps.forEach(op => {
      if (operations.has(op)) {
        const opMetrics = operations.get(op);
        breakdown[op] = {
          duration: opMetrics.duration,
          percentage: Math.round((opMetrics.duration / metrics.totalResponseTime) * 100),
          metadata: opMetrics.metadata
        };
      }
    });

    return breakdown;
  }

  /**
   * Update bottleneck statistics
   */
  updateBottleneckStats(operation, duration) {
    if (!this.globalStats.bottlenecks.has(operation)) {
      this.globalStats.bottlenecks.set(operation, {
        totalCalls: 0,
        totalDuration: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: Infinity
      });
    }

    const stats = this.globalStats.bottlenecks.get(operation);
    stats.totalCalls++;
    stats.totalDuration += duration;
    stats.averageDuration = Math.round(stats.totalDuration / stats.totalCalls);
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.minDuration = Math.min(stats.minDuration, duration);
  }

  /**
   * Update global performance statistics
   */
  updateGlobalStats(metrics) {
    this.globalStats.totalRequests++;
    const totalTime = this.globalStats.averageResponseTime * (this.globalStats.totalRequests - 1);
    this.globalStats.averageResponseTime = Math.round(
      (totalTime + metrics.totalResponseTime) / this.globalStats.totalRequests
    );
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const report = {
      summary: {
        totalRequests: this.globalStats.totalRequests,
        averageResponseTime: this.globalStats.averageResponseTime,
        target: 2000,
        performance: this.globalStats.averageResponseTime < 2000 ? 'OPTIMAL' : 'NEEDS_OPTIMIZATION'
      },
      bottlenecks: [],
      recommendations: []
    };

    // Analyze bottlenecks
    for (const [operation, stats] of this.globalStats.bottlenecks) {
      const bottleneck = {
        operation,
        averageDuration: stats.averageDuration,
        maxDuration: stats.maxDuration,
        totalCalls: stats.totalCalls,
        severity: this.getBottleneckSeverity(stats.averageDuration)
      };
      report.bottlenecks.push(bottleneck);
    }

    // Sort by severity
    report.bottlenecks.sort((a, b) => b.averageDuration - a.averageDuration);

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report.bottlenecks);

    return report;
  }

  /**
   * Get bottleneck severity level
   */
  getBottleneckSeverity(duration) {
    if (duration > 5000) return 'CRITICAL';
    if (duration > 2000) return 'HIGH';
    if (duration > 1000) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(bottlenecks) {
    const recommendations = [];

    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.operation) {
        case 'ai_processing':
          if (bottleneck.averageDuration > 3000) {
            recommendations.push({
              operation: 'ai_processing',
              issue: `AI processing taking ${bottleneck.averageDuration}ms (target: <1000ms)`,
              solutions: [
                'Switch to gemini-1.5-flash-8b for faster responses',
                'Optimize prompts to be more concise',
                'Implement response caching for common queries',
                'Use streaming responses to start TTS earlier'
              ]
            });
          }
          break;

        case 'text_to_speech':
          if (bottleneck.averageDuration > 2000) {
            recommendations.push({
              operation: 'text_to_speech',
              issue: `TTS generation taking ${bottleneck.averageDuration}ms (target: <1000ms)`,
              solutions: [
                'Reduce audio quality settings for speed',
                'Use shorter voice responses',
                'Implement audio caching for common phrases',
                'Enable streaming TTS if available'
              ]
            });
          }
          break;

        case 'speech_to_text':
          if (bottleneck.averageDuration > 1000) {
            recommendations.push({
              operation: 'speech_to_text',
              issue: `STT processing taking ${bottleneck.averageDuration}ms (target: <500ms)`,
              solutions: [
                'Use faster STT service or model',
                'Optimize audio preprocessing',
                'Implement real-time streaming STT'
              ]
            });
          }
          break;
      }
    });

    return recommendations;
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  cleanup(maxAge = 300000) { // 5 minutes
    const cutoff = Date.now() - maxAge;
    for (const [callId, metrics] of this.metrics) {
      if (metrics.startTime < cutoff) {
        this.metrics.delete(callId);
      }
    }
  }

  /**
   * Get current metrics for a call
   */
  getCallMetrics(callId) {
    return this.metrics.get(callId);
  }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();

// Cleanup old metrics every 5 minutes
setInterval(() => {
  performanceMonitor.cleanup();
}, 300000);

module.exports = performanceMonitor;
