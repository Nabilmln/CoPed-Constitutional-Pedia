/**
 * Unit Tests for Logging Service
 * 
 * Tests:
 * - Structured logging format
 * - Query and response logging
 * - Error logging with stack traces
 * - Sensitive data exclusion
 * 
 * Requirements: 19.1, 19.2, 19.3, 19.6, 19.7
 */

const fs = require('fs');
const path = require('path');

describe('Logger Service', () => {
  let logger;
  let consoleLogSpy;

  beforeEach(() => {
    // Clear module cache
    jest.resetModules();
    
    // Import fresh logger instance
    logger = require('../services/logger');
    
    // Spy on console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Structured Logging Format', () => {
    test('should format log entry with timestamp, level, component, and message', () => {
      const logEntry = logger.formatLogEntry('INFO', 'TestComponent', 'Test message', {
        key: 'value',
      });

      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('level', 'INFO');
      expect(logEntry).toHaveProperty('component', 'TestComponent');
      expect(logEntry).toHaveProperty('message', 'Test message');
      expect(logEntry).toHaveProperty('key', 'value');
    });

    test('should include ISO timestamp', () => {
      const logEntry = logger.formatLogEntry('INFO', 'Test', 'Message');
      
      // Check timestamp is in ISO format
      expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should convert level to uppercase', () => {
      const logEntry = logger.formatLogEntry('info', 'Test', 'Message');
      expect(logEntry.level).toBe('INFO');
    });
  });

  describe('Query Logging', () => {
    test('should log incoming query with parameters and client IP', () => {
      logger.logQuery({
        question: 'Test question about UUD 1945',
        ragType: 'native',
        model: 'gemini-1.5-flash',
        clientIP: '192.168.1.100',
        userId: 'user123',
        queryId: 'abc123',
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      
      expect(logOutput).toContain('[INFO]');
      expect(logOutput).toContain('[QueryHandler]');
      expect(logOutput).toContain('Incoming query');
      expect(logOutput).toContain('native');
      expect(logOutput).toContain('192.168.1.100');
    });

    test('should truncate long questions', () => {
      const longQuestion = 'A'.repeat(200);
      
      logger.logQuery({
        question: longQuestion,
        ragType: 'auto',
        model: 'gemini-1.5-flash',
        clientIP: '127.0.0.1',
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('...');
    });
  });

  describe('Response Logging', () => {
    test('should log response with timing and cache status', () => {
      logger.logResponse({
        queryId: 'query123',
        responseTime: 450,
        cacheHit: true,
        success: true,
        system: 'native',
        accuracy: 96.8,
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      
      expect(logOutput).toContain('[INFO]');
      expect(logOutput).toContain('[QueryHandler]');
      expect(logOutput).toContain('Query response');
      expect(logOutput).toContain('450ms');
      expect(logOutput).toContain('yes'); // cacheHit
    });

    test('should indicate cache miss', () => {
      logger.logResponse({
        queryId: 'query456',
        responseTime: 1200,
        cacheHit: false,
        success: true,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('no'); // cache miss
    });
  });

  describe('Error Logging with Stack Traces', () => {
    test('should log error with stack trace and context', () => {
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n    at test.js:10:5';

      logger.logError(error, {
        component: 'TestComponent',
        additionalInfo: 'Additional context',
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      
      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('[TestComponent]');
      expect(logOutput).toContain('Test error message');
      expect(logOutput).toContain('stack');
    });

    test('should include error type', () => {
      const error = new TypeError('Invalid type');
      
      logger.logError(error, { component: 'Test' });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('TypeError');
    });
  });

  describe('Sensitive Data Exclusion', () => {
    test('should redact API keys from strings', () => {
      const sensitiveData = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
      const sanitized = logger.sanitize(sensitiveData);
      
      expect(sanitized).not.toContain('AIzaSy');
      expect(sanitized).toContain('REDACTED_API_KEY');
    });

    test('should redact Bearer tokens', () => {
      const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload';
      const sanitized = logger.sanitize(token);
      
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized).toContain('Bearer REDACTED_TOKEN');
    });

    test('should redact sensitive object properties', () => {
      const data = {
        username: 'john',
        api_key: 'secret123',
        password: 'pass123',
        publicData: 'visible',
      };

      const sanitized = logger.sanitize(data);
      
      expect(sanitized.username).toBe('john');
      expect(sanitized.api_key).toBe('REDACTED');
      expect(sanitized.password).toBe('REDACTED');
      expect(sanitized.publicData).toBe('visible');
    });

    test('should handle nested objects', () => {
      const data = {
        user: {
          name: 'Alice',
          apiKey: 'secret',
        },
        token: 'Bearer xyz',
      };

      const sanitized = logger.sanitize(data);
      
      expect(sanitized.user.name).toBe('Alice');
      expect(sanitized.user.apiKey).toBe('REDACTED');
    });

    test('should not mutate original object', () => {
      const original = {
        api_key: 'secret',
        data: 'public',
      };

      const sanitized = logger.sanitize(original);
      
      expect(original.api_key).toBe('secret'); // Original unchanged
      expect(sanitized.api_key).toBe('REDACTED'); // Sanitized version
    });
  });

  describe('Log Level Methods', () => {
    test('should log info level', () => {
      logger.info('Component', 'Info message', { detail: 'value' });
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('[INFO]');
      expect(logOutput).toContain('Info message');
    });

    test('should log warn level', () => {
      logger.warn('Component', 'Warning message');
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('[WARN]');
      expect(logOutput).toContain('Warning message');
    });

    test('should log error level', () => {
      logger.error('Component', 'Error message');
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('Error message');
    });

    test('should log critical level', () => {
      logger.critical('Component', 'Critical message');
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('[CRITICAL]');
      expect(logOutput).toContain('Critical message');
    });
  });

  describe('Log Emojis', () => {
    test('should use correct emoji for each level', () => {
      logger.info('Test', 'Message');
      expect(consoleLogSpy.mock.calls[0][0]).toContain('ℹ️');

      logger.warn('Test', 'Message');
      expect(consoleLogSpy.mock.calls[1][0]).toContain('⚠️');

      logger.error('Test', 'Message');
      expect(consoleLogSpy.mock.calls[2][0]).toContain('❌');

      logger.critical('Test', 'Message');
      expect(consoleLogSpy.mock.calls[3][0]).toContain('🔴');
    });
  });

  describe('Context Data', () => {
    test('should include context data in log output', () => {
      logger.info('Component', 'Message', {
        userId: 'user123',
        action: 'login',
        duration: '100ms',
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('user123');
      expect(logOutput).toContain('login');
      expect(logOutput).toContain('100ms');
    });

    test('should handle empty context', () => {
      logger.info('Component', 'Message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('Message');
    });
  });
});
