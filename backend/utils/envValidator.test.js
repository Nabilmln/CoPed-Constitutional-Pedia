/**
 * Unit tests for environment variable validation module
 * 
 * Tests cover:
 * - Required variable validation
 * - Optional variable defaults
 * - Type conversion (int, float)
 * - Error handling for missing/invalid values
 * - Security (no logging of actual API key values)
 */

const {
  validateEnvironment,
  getEnvVar,
  getEnvInt,
  getEnvFloat,
  getGeminiApiKey,
  getGeminiModel,
  getPythonServiceUrl,
  getCacheTTL,
  getCacheMaxSize,
  getRelevanceThreshold,
} = require('./envValidator');

describe('Environment Variable Validation', () => {
  
  describe('validateEnvironment', () => {
    
    beforeEach(() => {
      // Clear environment before each test
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_MODEL;
      delete process.env.CACHE_TTL;
      delete process.env.CACHE_MAX_SIZE;
      delete process.env.RELEVANCE_THRESHOLD;
    });
    
    test('should succeed when all required variables are set', () => {
      process.env.GEMINI_API_KEY = 'AIzaSyTest123456789';
      process.env.GEMINI_MODEL = 'gemini-2.5-flash';
      process.env.CACHE_TTL = '7200';
      
      const result = validateEnvironment();
      
      expect(result.success).toBe(true);
      expect(result.messages.some(msg => msg.includes('✅'))).toBe(true);
      expect(result.messages.some(msg => msg.includes('Environment validation successful'))).toBe(true);
    });
    
    test('should fail when GEMINI_API_KEY is missing', () => {
      const result = validateEnvironment();
      
      expect(result.success).toBe(false);
      expect(result.messages.some(msg => msg.includes('GEMINI_API_KEY') && msg.includes('❌'))).toBe(true);
      expect(result.messages.some(msg => msg.includes('Cannot start service'))).toBe(true);
    });
    
    test('should fail when API key contains placeholder value', () => {
      process.env.GEMINI_API_KEY = 'your-gemini-api-key-here';
      
      const result = validateEnvironment();
      
      expect(result.success).toBe(false);
      expect(result.messages.some(msg => msg.includes('placeholder value'))).toBe(true);
    });
    
    test('should set default values for optional variables', () => {
      process.env.GEMINI_API_KEY = 'AIzaSyTest123456789';
      
      const result = validateEnvironment();
      
      expect(result.success).toBe(true);
      expect(process.env.GEMINI_MODEL).toBe('gemini-1.5-flash');
      expect(process.env.CACHE_TTL).toBe('3600');
      expect(process.env.CACHE_MAX_SIZE).toBe('100');
      expect(process.env.RELEVANCE_THRESHOLD).toBe('0.3');
    });
    
    test('should not expose actual API key value in messages', () => {
      const apiKey = 'AIzaSySecretKey123456789';
      process.env.GEMINI_API_KEY = apiKey;
      
      const result = validateEnvironment();
      
      // Check that the actual key value is never in any message
      result.messages.forEach(msg => {
        expect(msg).not.toContain(apiKey);
      });
      
      // But should confirm it's configured
      expect(result.messages.some(msg => 
        msg.includes('GEMINI_API_KEY') && msg.includes('configured')
      )).toBe(true);
    });
  });
  
  describe('getEnvVar', () => {
    
    test('should return environment variable value when it exists', () => {
      process.env.TEST_VAR = 'test_value';
      const result = getEnvVar('TEST_VAR');
      expect(result).toBe('test_value');
    });
    
    test('should return default value when variable is missing', () => {
      delete process.env.MISSING_VAR;
      const result = getEnvVar('MISSING_VAR', 'default_value');
      expect(result).toBe('default_value');
    });
    
    test('should throw error when required variable is missing', () => {
      delete process.env.MISSING_VAR;
      expect(() => {
        getEnvVar('MISSING_VAR', undefined, true);
      }).toThrow('Required environment variable');
    });
  });
  
  describe('getEnvInt', () => {
    
    test('should return integer when value is valid', () => {
      process.env.INT_VAR = '42';
      const result = getEnvInt('INT_VAR');
      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });
    
    test('should return default when variable is missing', () => {
      delete process.env.MISSING_INT;
      const result = getEnvInt('MISSING_INT', 100);
      expect(result).toBe(100);
    });
    
    test('should throw error when value is not a valid integer', () => {
      process.env.BAD_INT = 'not_a_number';
      expect(() => {
        getEnvInt('BAD_INT');
      }).toThrow('cannot be converted to integer');
    });
    
    test('should throw error when required integer is missing', () => {
      delete process.env.MISSING_INT;
      expect(() => {
        getEnvInt('MISSING_INT', undefined, true);
      }).toThrow('Required environment variable');
    });
  });
  
  describe('getEnvFloat', () => {
    
    test('should return float when value is valid', () => {
      process.env.FLOAT_VAR = '3.14';
      const result = getEnvFloat('FLOAT_VAR');
      expect(result).toBe(3.14);
      expect(typeof result).toBe('number');
    });
    
    test('should return default when variable is missing', () => {
      delete process.env.MISSING_FLOAT;
      const result = getEnvFloat('MISSING_FLOAT', 0.5);
      expect(result).toBe(0.5);
    });
    
    test('should throw error when value is not a valid float', () => {
      process.env.BAD_FLOAT = 'not_a_number';
      expect(() => {
        getEnvFloat('BAD_FLOAT');
      }).toThrow('cannot be converted to float');
    });
    
    test('should throw error when required float is missing', () => {
      delete process.env.MISSING_FLOAT;
      expect(() => {
        getEnvFloat('MISSING_FLOAT', undefined, true);
      }).toThrow('Required environment variable');
    });
  });
  
  describe('Convenience Functions', () => {
    
    beforeEach(() => {
      // Clear all environment variables
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_MODEL;
      delete process.env.PYTHON_SERVICE_URL;
      delete process.env.CACHE_TTL;
      delete process.env.CACHE_MAX_SIZE;
      delete process.env.RELEVANCE_THRESHOLD;
    });
    
    test('getGeminiApiKey should throw error when missing', () => {
      expect(() => {
        getGeminiApiKey();
      }).toThrow('GEMINI_API_KEY');
    });
    
    test('getGeminiApiKey should return value when set', () => {
      process.env.GEMINI_API_KEY = 'AIzaSyTest';
      expect(getGeminiApiKey()).toBe('AIzaSyTest');
    });
    
    test('getGeminiModel should return default when not set', () => {
      expect(getGeminiModel()).toBe('gemini-1.5-flash');
    });
    
    test('getGeminiModel should return environment value when set', () => {
      process.env.GEMINI_MODEL = 'gemini-2.0-flash';
      expect(getGeminiModel()).toBe('gemini-2.0-flash');
    });
    
    test('getPythonServiceUrl should return default when not set', () => {
      expect(getPythonServiceUrl()).toBe('http://localhost:5001');
    });
    
    test('getCacheTTL should return default as integer', () => {
      const result = getCacheTTL();
      expect(result).toBe(3600);
      expect(typeof result).toBe('number');
    });
    
    test('getCacheTTL should return environment value as integer', () => {
      process.env.CACHE_TTL = '7200';
      expect(getCacheTTL()).toBe(7200);
    });
    
    test('getCacheMaxSize should return default as integer', () => {
      const result = getCacheMaxSize();
      expect(result).toBe(100);
      expect(typeof result).toBe('number');
    });
    
    test('getRelevanceThreshold should return default as float', () => {
      const result = getRelevanceThreshold();
      expect(result).toBe(0.3);
      expect(typeof result).toBe('number');
    });
    
    test('getRelevanceThreshold should return environment value as float', () => {
      process.env.RELEVANCE_THRESHOLD = '0.5';
      expect(getRelevanceThreshold()).toBe(0.5);
    });
  });
  
  describe('Security Validation', () => {
    
    test('should detect placeholder API keys', () => {
      const placeholders = [
        'your-gemini-api-key-here',
        'your-api-key-here',
        'AIza...'
      ];
      
      placeholders.forEach(placeholder => {
        process.env.GEMINI_API_KEY = placeholder;
        const result = validateEnvironment();
        expect(result.success).toBe(false);
        expect(result.messages.some(msg => msg.toLowerCase().includes('placeholder'))).toBe(true);
      });
    });
    
    test('should accept valid-looking API keys', () => {
      const validKeys = [
        'AIzaSyTest123456789',
        'AIzaSyDifferentKey987654321',
      ];
      
      validKeys.forEach(key => {
        process.env.GEMINI_API_KEY = key;
        const result = validateEnvironment();
        expect(result.success).toBe(true);
      });
    });
  });
});
