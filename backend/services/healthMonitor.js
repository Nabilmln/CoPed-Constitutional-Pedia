/**
 * Health Monitor Service
 * 
 * Monitors FastAPI service health and manages fallback mode.
 * 
 * Features:
 * - Periodic health checks every 30 seconds
 * - Tracks consecutive failures
 * - Activates fallback mode after 3 consecutive failures
 * - Automatic recovery when service becomes available
 * - Structured logging with timestamps
 * 
 * Requirements: 17.5, 17.6, 18.5
 */

const axios = require('axios');

class HealthMonitor {
  constructor() {
    this.fastAPIUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';
    this.healthCheckInterval = 30000; // 30 seconds
    this.consecutiveFailures = 0;
    this.maxFailuresBeforeFallback = 3;
    this.isInFallbackMode = false;
    this.intervalId = null;
    this.abortController = null;
    this.isCheckInFlight = false;
    this.isRunning = false;
    this.lastHealthCheckTime = null;
    this.lastHealthStatus = null;
    
    // Health check statistics
    this.stats = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      lastError: null,
      lastSuccessTime: null,
      lastFailureTime: null,
      uptimeStart: Date.now(),
    };
  }

  /**
   * Start periodic health monitoring
   */
  start() {
    if (this.intervalId) {
      this.log('warn', 'Health monitor already running');
      return;
    }

    this.log('info', 'Starting health monitor', {
      interval: `${this.healthCheckInterval / 1000}s`,
      maxFailures: this.maxFailuresBeforeFallback,
      fastAPIUrl: this.fastAPIUrl,
    });

    this.isRunning = true;

    // Perform initial health check immediately
    void this.performScheduledHealthCheck();

    // Start periodic checks
    this.intervalId = setInterval(() => {
      void this.performScheduledHealthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * Stop periodic health monitoring
   */
  stop() {
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.log('info', 'Health monitor stopped');
  }

  /**
   * Run a lifecycle-managed check without allowing overlapping requests.
   */
  async performScheduledHealthCheck() {
    if (!this.isRunning || this.isCheckInFlight) {
      return;
    }

    this.isCheckInFlight = true;
    const controller = new AbortController();
    this.abortController = controller;

    try {
      await this.performHealthCheck({
        signal: controller.signal,
        ignoreCancellation: true,
      });
    } finally {
      if (this.abortController === controller) {
        this.abortController = null;
      }
      this.isCheckInFlight = false;
    }
  }

  /**
   * Perform a single health check
   */
  async performHealthCheck(options = {}) {
    const { signal, ignoreCancellation = false } = options;

    this.stats.totalChecks++;
    this.lastHealthCheckTime = new Date().toISOString();

    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.fastAPIUrl}/health`, {
        timeout: 5000, // 5 second timeout for health checks
        signal,
      });

      if (ignoreCancellation && (!this.isRunning || signal?.aborted)) {
        return;
      }

      const responseTime = Date.now() - startTime;
      this.lastHealthStatus = response.data;

      // Health check succeeded
      this.handleHealthCheckSuccess(response.data, responseTime);
    } catch (error) {
      if (
        ignoreCancellation &&
        (!this.isRunning || signal?.aborted || error.code === 'ERR_CANCELED')
      ) {
        return;
      }

      // Health check failed
      this.handleHealthCheckFailure(error);
    }
  }

  /**
   * Handle successful health check
   */
  handleHealthCheckSuccess(data, responseTime) {
    this.stats.successfulChecks++;
    this.stats.lastSuccessTime = new Date().toISOString();

    // Reset consecutive failures
    const wasInFallback = this.isInFallbackMode;
    this.consecutiveFailures = 0;

    // Recover from fallback mode if we were in it
    if (this.isInFallbackMode) {
      this.isInFallbackMode = false;
      this.log('info', 'FastAPI service recovered - deactivating fallback mode', {
        status: data.status,
        responseTime: `${responseTime}ms`,
      });
    } else {
      this.log('info', 'Health check passed', {
        status: data.status,
        responseTime: `${responseTime}ms`,
        uptime: data.uptime,
        totalQueries: data.total_queries,
      });
    }
  }

  /**
   * Handle failed health check
   */
  handleHealthCheckFailure(error) {
    this.stats.failedChecks++;
    this.stats.lastFailureTime = new Date().toISOString();
    this.stats.lastError = error.message;

    this.consecutiveFailures++;

    const errorDetails = {
      consecutiveFailures: this.consecutiveFailures,
      maxFailures: this.maxFailuresBeforeFallback,
      error: error.message,
    };

    if (error.code) {
      errorDetails.errorCode = error.code;
    }

    // Log the failure
    this.log('error', 'Health check failed', errorDetails);

    // Activate fallback mode if threshold reached
    if (this.consecutiveFailures >= this.maxFailuresBeforeFallback && !this.isInFallbackMode) {
      this.activateFallbackMode();
    }
  }

  /**
   * Activate fallback mode
   */
  activateFallbackMode() {
    this.isInFallbackMode = true;
    
    this.log('critical', 'FastAPI service unhealthy - ACTIVATING FALLBACK MODE', {
      consecutiveFailures: this.consecutiveFailures,
      lastError: this.stats.lastError,
      fallbackMode: 'ACTIVE',
      message: 'System will use direct Gemini API calls',
    });
  }

  /**
   * Check if system is in fallback mode
   */
  isInFallback() {
    return this.isInFallbackMode;
  }

  /**
   * Get current health status
   */
  getStatus() {
    return {
      fastAPIUrl: this.fastAPIUrl,
      isInFallbackMode: this.isInFallbackMode,
      consecutiveFailures: this.consecutiveFailures,
      lastHealthCheckTime: this.lastHealthCheckTime,
      lastHealthStatus: this.lastHealthStatus,
      stats: {
        ...this.stats,
        uptime: Math.floor((Date.now() - this.stats.uptimeStart) / 1000),
        successRate: this.stats.totalChecks > 0
          ? ((this.stats.successfulChecks / this.stats.totalChecks) * 100).toFixed(2) + '%'
          : '0%',
      },
    };
  }

  /**
   * Structured logging with timestamp, level, component
   * Requirements: 19.1, 19.2, 19.3, 19.6, 19.7
   */
  log(level, message, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      component: 'HealthMonitor',
      message,
      ...context,
    };

    // Format for console output
    const contextStr = Object.keys(context).length > 0
      ? ` | ${JSON.stringify(context)}`
      : '';

    const levelEmoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      critical: '🔴',
    };

    const emoji = levelEmoji[level] || '📝';

    console.log(`${emoji} [${logEntry.timestamp}] [${logEntry.level}] [${logEntry.component}] ${message}${contextStr}`);

    // In production, you might want to send this to a logging service
    // Example: await loggingService.send(logEntry);
  }
}

// Export singleton instance
module.exports = new HealthMonitor();
