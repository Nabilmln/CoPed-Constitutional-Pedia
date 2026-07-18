/**
 * Unit Tests for Health Monitoring
 * 
 * Tests:
 * - Health check success flow
 * - Fallback activation after failures
 * - Automatic recovery
 * 
 * Requirements: 18.5
 */

const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('Health Monitor', () => {
  let healthMonitor;
  
  beforeEach(() => {
    // Clear mocks but keep module in cache
    jest.clearAllMocks();
    
    // Mock timers
    jest.useFakeTimers();
    
    // Setup axios mock with default behavior
    axios.create = jest.fn(() => axios);
    axios.get = jest.fn();
    
    // Import or get cached healthMonitor
    if (!healthMonitor) {
      healthMonitor = require('../services/healthMonitor');
    }
    
    // Reset state completely
    healthMonitor.consecutiveFailures = 0;
    healthMonitor.isInFallbackMode = false;
    healthMonitor.stats.totalChecks = 0;
    healthMonitor.stats.successfulChecks = 0;
    healthMonitor.stats.failedChecks = 0;
    healthMonitor.stats.lastError = null;
    healthMonitor.lastHealthStatus = null;
    healthMonitor.lastHealthCheckTime = null;
    
    // Clear any running intervals
    if (healthMonitor.intervalId) {
      clearInterval(healthMonitor.intervalId);
      healthMonitor.intervalId = null;
    }
  });

  afterEach(() => {
    // Stop health monitor to clean up intervals
    if (healthMonitor.intervalId) {
      clearInterval(healthMonitor.intervalId);
      healthMonitor.intervalId = null;
    }
    
    jest.useRealTimers();
  });

  describe('Health Check Success Flow', () => {
    test('should successfully perform health check when FastAPI is healthy', async () => {
      // Mock successful health check response
      const mockHealthData = {
        status: 'healthy',
        uptime: 3600,
        total_queries: 100,
        average_response_time: 250,
        error_count: 0,
      };

      axios.get.mockResolvedValue({
        data: mockHealthData,
      });

      // Perform health check
      await healthMonitor.performHealthCheck();

      // Verify axios was called
      expect(axios.get).toHaveBeenCalled();

      // Verify state after successful check
      expect(healthMonitor.consecutiveFailures).toBe(0);
      expect(healthMonitor.isInFallbackMode).toBe(false);
      expect(healthMonitor.stats.successfulChecks).toBe(1);
      expect(healthMonitor.stats.totalChecks).toBe(1);
      expect(healthMonitor.lastHealthStatus).toEqual(mockHealthData);
    });

    test('should reset consecutive failures on successful check', async () => {
      // Set initial failure state
      healthMonitor.consecutiveFailures = 2;

      // Mock successful response
      axios.get.mockResolvedValue({
        data: { status: 'healthy', uptime: 100 },
      });

      await healthMonitor.performHealthCheck();

      // Should reset consecutive failures
      expect(healthMonitor.consecutiveFailures).toBe(0);
      expect(healthMonitor.isInFallbackMode).toBe(false);
    });

    test('should recover from fallback mode when service is healthy again', async () => {
      // Set initial fallback state
      healthMonitor.isInFallbackMode = true;
      healthMonitor.consecutiveFailures = 3;

      // Mock successful response
      axios.get.mockResolvedValue({
        data: { status: 'healthy', uptime: 100 },
      });

      await healthMonitor.performHealthCheck();

      // Should exit fallback mode
      expect(healthMonitor.isInFallbackMode).toBe(false);
      expect(healthMonitor.consecutiveFailures).toBe(0);
    });
  });

  describe('Fallback Activation After Failures', () => {
    test('should increment consecutive failures on health check failure', async () => {
      // Mock failed health check
      axios.get.mockRejectedValue(new Error('Connection refused'));

      await healthMonitor.performHealthCheck();

      expect(healthMonitor.consecutiveFailures).toBe(1);
      expect(healthMonitor.stats.failedChecks).toBe(1);
      expect(healthMonitor.isInFallbackMode).toBe(false); // Not yet in fallback
    });

    test('should activate fallback mode after 3 consecutive failures', async () => {
      // Mock failed health checks
      axios.get.mockRejectedValue(new Error('Connection refused'));

      // Perform 3 failed checks
      await healthMonitor.performHealthCheck();
      expect(healthMonitor.consecutiveFailures).toBe(1);
      expect(healthMonitor.isInFallbackMode).toBe(false);

      await healthMonitor.performHealthCheck();
      expect(healthMonitor.consecutiveFailures).toBe(2);
      expect(healthMonitor.isInFallbackMode).toBe(false);

      await healthMonitor.performHealthCheck();
      expect(healthMonitor.consecutiveFailures).toBe(3);
      expect(healthMonitor.isInFallbackMode).toBe(true); // Fallback activated!
    });

    test('should not activate fallback mode for less than 3 failures', async () => {
      // Mock failed health checks
      axios.get.mockRejectedValue(new Error('Timeout'));

      await healthMonitor.performHealthCheck();
      await healthMonitor.performHealthCheck();

      expect(healthMonitor.consecutiveFailures).toBe(2);
      expect(healthMonitor.isInFallbackMode).toBe(false);
    });

    test('should log critical error when activating fallback mode', async () => {
      // Spy on console.log to verify critical logging
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock failed health checks
      axios.get.mockRejectedValue(new Error('Service unavailable'));

      // Perform 3 failed checks
      await healthMonitor.performHealthCheck();
      await healthMonitor.performHealthCheck();
      await healthMonitor.performHealthCheck();

      // Verify critical log was called
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔴')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('ACTIVATING FALLBACK MODE')
      );

      logSpy.mockRestore();
    });
  });

  describe('Automatic Recovery', () => {
    test('should automatically recover when service becomes healthy', async () => {
      // Start in fallback mode
      healthMonitor.isInFallbackMode = true;
      healthMonitor.consecutiveFailures = 5;

      // Mock successful health check
      axios.get.mockResolvedValue({
        data: { status: 'healthy', uptime: 200 },
      });

      await healthMonitor.performHealthCheck();

      // Should recover
      expect(healthMonitor.isInFallbackMode).toBe(false);
      expect(healthMonitor.consecutiveFailures).toBe(0);
    });

    test('should track recovery in statistics', async () => {
      // Start with some failures
      axios.get.mockRejectedValue(new Error('Error'));
      await healthMonitor.performHealthCheck();
      await healthMonitor.performHealthCheck();

      const failedBefore = healthMonitor.stats.failedChecks;

      // Now succeed
      axios.get.mockResolvedValue({
        data: { status: 'healthy' },
      });
      await healthMonitor.performHealthCheck();

      expect(healthMonitor.stats.failedChecks).toBe(failedBefore);
      expect(healthMonitor.stats.successfulChecks).toBe(1);
      expect(healthMonitor.stats.totalChecks).toBe(3);
    });
  });

  describe('Health Monitor Controls', () => {
    test('should start periodic health checks', () => {
      healthMonitor.start();

      expect(healthMonitor.intervalId).not.toBeNull();
    });

    test('should stop periodic health checks', () => {
      healthMonitor.start();
      const intervalId = healthMonitor.intervalId;
      
      healthMonitor.stop();

      expect(healthMonitor.intervalId).toBeNull();
    });

    test('should cancel an in-flight scheduled health check when stopped', async () => {
      let capturedSignal;

      axios.get.mockImplementation((url, options) => {
        capturedSignal = options.signal;

        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const error = new Error('Request canceled');
            error.code = 'ERR_CANCELED';
            reject(error);
          });
        });
      });

      healthMonitor.start();
      await Promise.resolve();

      expect(capturedSignal).toBeDefined();
      expect(capturedSignal.aborted).toBe(false);

      healthMonitor.stop();
      await Promise.resolve();

      expect(capturedSignal.aborted).toBe(true);
      expect(healthMonitor.isRunning).toBe(false);
      expect(healthMonitor.intervalId).toBeNull();
    });

    test('should not start if already running', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      healthMonitor.start();
      healthMonitor.start(); // Try to start again

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('already running')
      );

      logSpy.mockRestore();
    });
  });

  describe('Status Reporting', () => {
    test('should return current status', () => {
      healthMonitor.consecutiveFailures = 2;
      healthMonitor.isInFallbackMode = false;
      healthMonitor.lastHealthCheckTime = '2024-01-01T00:00:00Z';

      const status = healthMonitor.getStatus();

      expect(status).toHaveProperty('fastAPIUrl');
      expect(status).toHaveProperty('isInFallbackMode');
      expect(status).toHaveProperty('consecutiveFailures');
      expect(status).toHaveProperty('lastHealthCheckTime');
      expect(status).toHaveProperty('stats');
      
      expect(status.consecutiveFailures).toBe(2);
      expect(status.isInFallbackMode).toBe(false);
    });

    test('should include success rate in statistics', () => {
      healthMonitor.stats.totalChecks = 10;
      healthMonitor.stats.successfulChecks = 8;

      const status = healthMonitor.getStatus();

      expect(status.stats.successRate).toBe('80.00%');
    });
  });

  describe('isInFallback method', () => {
    test('should return true when in fallback mode', () => {
      healthMonitor.isInFallbackMode = true;
      expect(healthMonitor.isInFallback()).toBe(true);
    });

    test('should return false when not in fallback mode', () => {
      healthMonitor.isInFallbackMode = false;
      expect(healthMonitor.isInFallback()).toBe(false);
    });
  });
});
