/**
 * Environment Variable Validation Module
 * 
 * This module validates required and optional environment variables at startup.
 * It ensures the application fails fast with descriptive errors if critical
 * configuration is missing.
 * 
 * Security Rules:
 * - Never log the actual value of API keys
 * - Only log that required variables are "configured"
 * - Fail fast on missing required variables
 * - Provide defaults for optional variables
 */

require('dotenv').config();

/**
 * Validate environment variables at application startup
 * @returns {Object} { success: boolean, messages: string[] }
 */
function validateEnvironment() {
  const required = {
    'GEMINI_API_KEY': 'API key for Google Gemini (REQUIRED)',
  };
  
  const optional = {
    'GEMINI_MODEL': 'gemini-1.5-flash',
    'PYTHON_SERVICE_URL': 'http://localhost:5001',
    'CACHE_TTL': '3600',
    'CACHE_MAX_SIZE': '100',
    'RELEVANCE_THRESHOLD': '0.3',
    'PORT': '5000',
    'NODE_ENV': 'development',
    'FRONTEND_URL': 'http://localhost:3000',
  };
  
  const messages = [];
  const errors = [];
  
  // Check required variables
  for (const [varName, description] of Object.entries(required)) {
    const value = process.env[varName];
    
    if (!value) {
      errors.push(`❌ Missing required env var: ${varName} (${description})`);
    } else {
      // Check for placeholder values
      if (varName === 'GEMINI_API_KEY') {
        const placeholders = ['your-gemini-api-key-here', 'your-api-key-here', 'AIza...'];
        if (placeholders.includes(value)) {
          errors.push(`❌ ${varName} contains placeholder value - replace with actual API key`);
        } else {
          // Log success WITHOUT revealing the value
          messages.push(`✅ ${varName}: configured (key length: ${value.length} chars)`);
        }
      } else {
        messages.push(`✅ ${varName}: configured`);
      }
    }
  }
  
  // Set optional variables with defaults
  for (const [varName, defaultValue] of Object.entries(optional)) {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
      messages.push(`✅ ${varName}: ${defaultValue} (default)`);
    } else {
      messages.push(`✅ ${varName}: ${process.env[varName]}`);
    }
  }
  
  // If there are errors, validation failed
  if (errors.length > 0) {
    messages.push(...errors);
    messages.push('');
    messages.push('🚫 Cannot start service due to environment configuration errors');
    messages.push('📝 Please check your .env file and ensure all required variables are set');
    messages.push('📄 See .env.example for a template with all required variables');
    return { success: false, messages };
  }
  
  messages.push('');
  messages.push('✅ Environment validation successful');
  return { success: true, messages };
}

/**
 * Print validation results to console
 * @param {Object} result - { success: boolean, messages: string[] }
 */
function printValidationResults(result) {
  console.log('\n' + '='.repeat(60));
  console.log('Environment Variable Validation');
  console.log('='.repeat(60));
  result.messages.forEach(msg => console.log(msg));
  console.log('='.repeat(60) + '\n');
}

/**
 * Validate environment and exit with error code 1 if validation fails.
 * Use this at application startup to ensure all required config is present.
 */
function validateAndExitOnFailure() {
  const result = validateEnvironment();
  printValidationResults(result);
  
  if (!result.success) {
    process.exit(1);
  }
}

/**
 * Get an environment variable with optional default and required flag
 * @param {string} name - Environment variable name
 * @param {*} defaultValue - Default value if not set (optional)
 * @param {boolean} required - If true, throws error if variable not set
 * @returns {string} Environment variable value
 * @throws {Error} If required=true and variable is not set
 */
function getEnvVar(name, defaultValue = undefined, required = false) {
  const value = process.env[name] || defaultValue;
  
  if (required && !value) {
    throw new Error(
      `Required environment variable ${name} is not set. ` +
      `Please set it in your .env file or environment.`
    );
  }
  
  return value;
}

/**
 * Get an environment variable as an integer
 * @param {string} name - Environment variable name
 * @param {number} defaultValue - Default value if not set (optional)
 * @param {boolean} required - If true, throws error if variable not set
 * @returns {number} Environment variable value as integer
 * @throws {Error} If required=true and variable is not set, or value cannot be parsed
 */
function getEnvInt(name, defaultValue = undefined, required = false) {
  const value = process.env[name];
  
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new Error(
        `Required environment variable ${name} is not set. ` +
        `Please set it in your .env file or environment.`
      );
    }
    return defaultValue;
  }
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${name}=${value} cannot be converted to integer. ` +
      `Please provide a valid integer value.`
    );
  }
  
  return parsed;
}

/**
 * Get an environment variable as a float
 * @param {string} name - Environment variable name
 * @param {number} defaultValue - Default value if not set (optional)
 * @param {boolean} required - If true, throws error if variable not set
 * @returns {number} Environment variable value as float
 * @throws {Error} If required=true and variable is not set, or value cannot be parsed
 */
function getEnvFloat(name, defaultValue = undefined, required = false) {
  const value = process.env[name];
  
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new Error(
        `Required environment variable ${name} is not set. ` +
        `Please set it in your .env file or environment.`
      );
    }
    return defaultValue;
  }
  
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${name}=${value} cannot be converted to float. ` +
      `Please provide a valid numeric value.`
    );
  }
  
  return parsed;
}

// Convenience functions for commonly used environment variables
const getGeminiApiKey = () => getEnvVar('GEMINI_API_KEY', undefined, true);
const getGeminiModel = () => getEnvVar('GEMINI_MODEL', 'gemini-1.5-flash');
const getPythonServiceUrl = () => getEnvVar('PYTHON_SERVICE_URL', 'http://localhost:5001');
const getCacheTTL = () => getEnvInt('CACHE_TTL', 3600);
const getCacheMaxSize = () => getEnvInt('CACHE_MAX_SIZE', 100);
const getRelevanceThreshold = () => getEnvFloat('RELEVANCE_THRESHOLD', 0.3);
const getPort = () => getEnvInt('PORT', 5000);
const getFrontendUrl = () => getEnvVar('FRONTEND_URL', 'http://localhost:3000');

module.exports = {
  validateEnvironment,
  printValidationResults,
  validateAndExitOnFailure,
  getEnvVar,
  getEnvInt,
  getEnvFloat,
  // Convenience exports
  getGeminiApiKey,
  getGeminiModel,
  getPythonServiceUrl,
  getCacheTTL,
  getCacheMaxSize,
  getRelevanceThreshold,
  getPort,
  getFrontendUrl,
};

// If run directly (node envValidator.js), perform validation
if (require.main === module) {
  validateAndExitOnFailure();
}
