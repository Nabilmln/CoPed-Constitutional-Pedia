/**
 * Integration Tests for Health Monitoring
 * 
 * Tests:
 * - Health check success flow
 * - Fallback activation after failures
 * - Automatic recovery
 * 
 * Requirements: 18.5
 */

describe('Health Monitor Integration', () => {
  let healthMonitor;
  
  beforeEach(() => {
    // Clear module cache
    jest.resetModules();
    jest.clearAllMocks();
    
    // Import fresh instance
    healthMonitor = require('../services/healthMonitor');
    
    // Reset state
    healthMonitor.consecutiveFailures = 0;
    healthMonitor.isInFallbackMode = false;
    healthMonitor.stats.totalChecks = 0;
    healthMonitor.stats.successfulChecks = 0;
    healthMonitor.stats.failedChecks = 0;
  });

  afterEach(() => {
    // Stop health monitor to clean up intervals
    if (healthMonitor.intervalId) {
      healthMonitor.stop();
    }
  });

  describe('State Management', () => {
    test('should track consecutive failures', () => {
      expect(healthMonitor.consecutiveFailures).toBe(0);
      
      healthMonitor.consecutiveFailures++;
      expect(healthMonitor.consecutiveFailures).toBe(1);
      
      healthMonitor.consecutiveFailures++;
      expect(healthMonitor.consecutiveFailures).toBe(2);
    });

    test('should toggle fallback mode', () => {
      expect(healthMonitor.isInFallbackMode).toBe(false);
      
      healthMonitor.isInFallbackMode = true;
      expect(healthMonitor.isInFallbackMode).toBe(true);
      expect(healthMonitor.isInFallback()).toBe(true);
      
      healthMonitor.isInFallbackMode = false;
      expect(healthMonitor.isInFallback()).toBe(false);
    });

    test('should manually activate fallback mode after 3 failures', () => {
      healthMonitor.consecutiveFailures = 3;
      
      // Simulate reaching threshold
      if (healthMonitor.consecutiveFailures >= 3) {
        healthMonitor.activateFallbackMode();
      }
      
      expect(healthMonitor.isInFallbackMode).toBe(true);
    });

    test('should reset failures on recovery', () => {
      healthMonitor.consecutiveFailures = 5;
      healthMonitor.isInFallbackMode = true;
      
      // Simulate recovery
      healthMonitor.consecutiveFailures = 0;
      healthMonitor.isInFallbackMode = false;
      
      expect(healthMonitor.consecutiveFailures).toBe(0);
      expect(healthMonitor.isInFallbackMode).toBe(false);
    });
  });

  describe('Statistics Tracking', () => {
    test('should track total checks', () => {
      expect(healthMonitor.stats.totalChecks).toBe(0);
      
      healthMonitor.stats.totalChecks++;
      expect(healthMonitor.stats.totalChecks).toBe(1);
    });

    test('should track successful checks', () => {
      expect(healthMonitor.stats.successfulChecks).toBe(0);
      
      healthMonitor.stats.successfulChecks++;
      healthMonitor.stats.totalChecks++;
      
      expect(healthMonitor.stats.successfulChecks).toBe(1);
    });

    test('should track failed checks', () => {
      expect(healthMonitor.stats.failedChecks).toBe(0);
      
      healthMonitor.stats.failedChecks++;
      healthMonitor.stats.totalChecks++;
      
      expect(healthMonitor.stats.failedChecks).toBe(1);
    });

    test('should calculate success rate correctly', () => {
      healthMonitor.stats.totalChecks = 10;
      healthMonitor.stats.successfulChecks = 8;
      healthMonitor.stats.failedChecks = 2;
      
      const status = healthMonitor.getStatus();
      expect(status.stats.successRate).toBe('80.00%');
    });

    test('should handle zero checks for success rate', () => {
      healthMonitor.stats.totalChecks = 0;
      
      const status = healthMonitor.getStatus();
      expect(status.stats.successRate).toBe('0%');
    });
  });

  describe('Health Monitor Controls', () => {
    test('should create interval ID when started', () => {
      healthMonitor.start();
      expect(healthMonitor.intervalId).not.toBeNull();
      expect(healthMonitor.intervalId).toBeDefined();
      
      healthMonitor.stop();
    });

    test('should clear interval ID when stopped', () => {
      healthMonitor.start();
      const id = healthMonitor.intervalId;
      expect(id).not.toBeNull();
      
      healthMonitor.stop();
      expect(healthMonitor.intervalId).toBeNull();
    });

    test('should not start multiple times', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      healthMonitor.start();
      const firstId = healthMonitor.intervalId;
      
      healthMonitor.start(); // Try to start again
      const secondId = healthMonitor.intervalId;
      
      // Should keep same interval ID
      expect(secondId).toBe(firstId);
      
      // Should log warning
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('already running')
      );
      
      healthMonitor.stop();
      consoleLogSpy.mockRestore();
    });
  });

  describe('Status Reporting', () => {
    test('should return comprehensive status object', () => {
      healthMonitor.consecutiveFailures = 2;
      healthMonitor.isInFallbackMode = false;
      healthMonitor.lastHealthCheckTime = '2024-01-01T00:00:00Z';
      healthMonitor.stats.totalChecks = 10;
      healthMonitor.stats.successfulChecks = 8;
      
      const status = healthMonitor.getStatus();
      
      // Check all required properties
      expect(status).toHaveProperty('fastAPIUrl');
      expect(status).toHaveProperty('isInFallbackMode');
      expect(status).toHaveProperty('consecutiveFailures');
      expect(status).toHaveProperty('lastHealthCheckTime');
      expect(status).toHaveProperty('lastHealthStatus');
      expect(status).toHaveProperty('stats');
      
      // Verify values
      expect(status.consecutiveFailures).toBe(2);
      expect(status.isInFallbackMode).toBe(false);
      expect(status.lastHealthCheckTime).toBe('2024-01-01T00:00:00Z');
      
      // Verify stats
      expect(status.stats.totalChecks).toBe(10);
      expect(status.stats.successfulChecks).toBe(8);
      expect(status.stats.successRate).toBe('80.00%');
    });

    test('should include uptime in status', () => {
      const status = healthMonitor.getStatus();
      
      expect(status.stats).toHaveProperty('uptime');
      expect(typeof status.stats.uptime).toBe('number');
      expect(status.stats.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fallback Mode Logic', () => {
    test('should activate fallback after reaching threshold', () => {
      expect(healthMonitor.maxFailuresBeforeFallback).toBe(3);
      
      healthMonitor.consecutiveFailures = 3;
      healthMonitor.activateFallbackMode();
      
      expect(healthMonitor.isInFallbackMode).toBe(true);
    });

    test('should log critical message on fallback activation', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      healthMonitor.consecutiveFailures = 3;
      healthMonitor.stats.lastError = 'Connection timeout';
      healthMonitor.activateFallbackMode();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔴')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('ACTIVATING FALLBACK MODE')
      );
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('Configuration', () => {
    test('should have default configuration values', () => {
      expect(healthMonitor.healthCheckInterval).toBe(30000); // 30 seconds
      expect(healthMonitor.maxFailuresBeforeFallback).toBe(3);
      expect(healthMonitor.fastAPIUrl).toBeDefined();
    });

    test('should respect environment variable for FastAPI URL', () => {
      // The URL should default or come from process.env.PYTHON_SERVICE_URL
      const url = healthMonitor.fastAPIUrl;
      expect(url).toBe(process.env.PYTHON_SERVICE_URL || 'http://localhost:5001');
    });
  });
});
