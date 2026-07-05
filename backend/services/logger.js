/**
 * Structured Logging Service
 * 
 * Provides centralized logging infrastructure with structured format.
 * 
 * Features:
 * - Structured logging format with timestamp, level, component
 * - Query and response logging
 * - Error logging with stack traces
 * - Sensitive data exclusion (API keys, personal data)
 * - Different log levels: INFO, WARN, ERROR, CRITICAL
 * 
 * Requirements: 19.1, 19.2, 19.3, 19.6, 19.7
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.sensitivePatterns = [
      /api[_-]?key/gi,
      /password/gi,
      /token/gi,
      /secret/gi,
      /authorization/gi,
      /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
      /AIzaSy[A-Za-z0-9_-]{33}/gi, // Google API Key pattern
    ];
    
    // Ensure logs directory exists
    this.ensureLogDirectory();
  }

  /**
   * Ensure logs directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Sanitize data to remove sensitive information
   */
  sanitize(data) {
    if (typeof data !== 'object' || data === null) {
      const str = String(data);
      let sanitized = str;
      
      // Replace API keys
      sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, 'REDACTED_API_KEY');
      
      // Replace Bearer tokens
      sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer REDACTED_TOKEN');
      
      return sanitized;
    }

    const sanitized = { ...data };

    // Recursively sanitize object properties
    for (const key in sanitized) {
      // Check if key matches sensitive patterns
      const isSensitiveKey = this.sensitivePatterns.some(pattern => pattern.test(key));
      
      if (isSensitiveKey) {
        sanitized[key] = 'REDACTED';
      } else if (typeof sanitized[key] === 'string') {
        sanitized[key] = this.sanitize(sanitized[key]);
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Format log entry with structured format
   */
  formatLogEntry(level, component, message, context = {}) {
    const sanitizedContext = this.sanitize(context);
    
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      component,
      message,
      ...sanitizedContext,
    };
  }

  /**
   * Write log to console and optionally to file
   */
  writeLog(logEntry) {
    const levelEmojis = {
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌',
      CRITICAL: '🔴',
    };

    const emoji = levelEmojis[logEntry.level] || '📝';
    const contextStr = Object.keys(logEntry)
      .filter(key => !['timestamp', 'level', 'component', 'message'].includes(key))
      .map(key => `${key}=${JSON.stringify(logEntry[key])}`)
      .join(', ');

    const logLine = `${emoji} [${logEntry.timestamp}] [${logEntry.level}] [${logEntry.component}] ${logEntry.message}${contextStr ? ' | ' + contextStr : ''}`;
    
    console.log(logLine);

    // In production, write to file
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile(logEntry);
    }
  }

  /**
   * Write log to file
   */
  writeToFile(logEntry) {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `app-${date}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';

    fs.appendFileSync(logFile, logLine, 'utf8');
  }

  /**
   * Log incoming query
   * Requirements: 19.2
   */
  logQuery(queryData) {
    const { question, ragType, model, clientIP, userId } = queryData;
    
    this.writeLog(this.formatLogEntry('INFO', 'QueryHandler', 'Incoming query', {
      question: question.substring(0, 100) + (question.length > 100 ? '...' : ''),
      ragType,
      model,
      clientIP: clientIP || 'unknown',
      userId: userId || 'anonymous',
    }));
  }

  /**
   * Log query response
   * Requirements: 19.3
   */
  logResponse(responseData) {
    const { queryId, responseTime, cacheHit, success, system, accuracy } = responseData;
    
    this.writeLog(this.formatLogEntry('INFO', 'QueryHandler', 'Query response', {
      queryId: queryId || 'N/A',
      responseTime: `${responseTime}ms`,
      cacheHit: cacheHit ? 'yes' : 'no',
      success: success ? 'yes' : 'no',
      system: system || 'unknown',
      accuracy: accuracy || 'N/A',
    }));
  }

  /**
   * Log error with stack trace
   * Requirements: 19.6
   */
  logError(error, context = {}) {
    const errorEntry = this.formatLogEntry('ERROR', context.component || 'Application', error.message, {
      ...context,
      errorType: error.name,
      stack: error.stack,
    });
    
    this.writeLog(errorEntry);
  }

  /**
   * Generic log methods
   */
  info(component, message, context = {}) {
    this.writeLog(this.formatLogEntry('INFO', component, message, context));
  }

  warn(component, message, context = {}) {
    this.writeLog(this.formatLogEntry('WARN', component, message, context));
  }

  error(component, message, context = {}) {
    this.writeLog(this.formatLogEntry('ERROR', component, message, context));
  }

  critical(component, message, context = {}) {
    this.writeLog(this.formatLogEntry('CRITICAL', component, message, context));
  }

  /**
   * Get log file path for a specific date
   */
  getLogFilePath(date = null) {
    const dateStr = date || new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `app-${dateStr}.log`);
  }

  /**
   * Read logs from file
   */
  readLogs(date = null, limit = 100) {
    const logFile = this.getLogFilePath(date);
    
    if (!fs.existsSync(logFile)) {
      return [];
    }

    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line);
    
    // Parse JSON lines and return most recent
    return lines
      .slice(-limit)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(entry => entry !== null);
  }
}

// Export singleton instance
module.exports = new Logger();
