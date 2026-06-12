"""
Environment Variable Validation Module

This module validates required and optional environment variables at startup.
It ensures the application fails fast with descriptive errors if critical
configuration is missing.

Security Rules:
- Never log the actual value of API keys
- Only log that required variables are "configured"
- Fail fast on missing required variables
- Provide defaults for optional variables
"""

import os
import sys
from typing import Dict, List, Tuple


def validate_environment() -> Tuple[bool, List[str]]:
    """
    Validate required environment variables at startup.
    
    Returns:
        Tuple[bool, List[str]]: (success, list of error/warning messages)
    """
    required_vars = {
        'GEMINI_API_KEY': 'API key for Google Gemini (REQUIRED)',
    }
    
    optional_vars = {
        'GEMINI_MODEL': 'gemini-1.5-flash',
        'PYTHON_SERVICE_URL': 'http://localhost:5001',
        'CACHE_TTL': '3600',
        'CACHE_MAX_SIZE': '100',
        'RELEVANCE_THRESHOLD': '0.3'
    }
    
    messages = []
    errors = []
    
    # Check required variables
    for var, description in required_vars.items():
        value = os.getenv(var)
        if not value:
            errors.append(f"❌ Missing required env var: {var} ({description})")
        else:
            # Validate format (Gemini API keys should start with 'AIza' or similar patterns)
            if var == 'GEMINI_API_KEY':
                # Don't validate exact format as it may change, just check it's not placeholder
                if value in ['your-gemini-api-key-here', 'your-api-key-here', 'AIza...']:
                    errors.append(f"❌ {var} contains placeholder value - replace with actual API key")
                else:
                    # Log success WITHOUT revealing the value
                    messages.append(f"✅ {var}: configured (key length: {len(value)} chars)")
            else:
                messages.append(f"✅ {var}: configured")
    
    # Set optional variables with defaults
    for var, default in optional_vars.items():
        value = os.getenv(var, default)
        if os.getenv(var) is None:
            # Variable not set, using default
            os.environ[var] = default
            messages.append(f"✅ {var}: {default} (default)")
        else:
            # Variable was set by user
            messages.append(f"✅ {var}: {value}")
    
    # If there are errors, compilation failed
    if errors:
        messages.extend(errors)
        messages.append("\n🚫 Cannot start service due to environment configuration errors")
        messages.append("📝 Please check your .env file and ensure all required variables are set")
        messages.append("📄 See .env.example for a template with all required variables")
        return False, messages
    
    messages.append("\n✅ Environment validation successful")
    return True, messages


def print_validation_results(success: bool, messages: List[str]) -> None:
    """
    Print validation results to console.
    
    Args:
        success: Whether validation succeeded
        messages: List of messages to print
    """
    print("\n" + "="*60)
    print("Environment Variable Validation")
    print("="*60)
    for message in messages:
        print(message)
    print("="*60 + "\n")


def validate_and_exit_on_failure() -> None:
    """
    Validate environment and exit with error code 1 if validation fails.
    Use this at application startup to ensure all required config is present.
    """
    success, messages = validate_environment()
    print_validation_results(success, messages)
    
    if not success:
        sys.exit(1)


def get_env_var(name: str, default: str = None, required: bool = False) -> str:
    """
    Get an environment variable with optional default and required flag.
    
    Args:
        name: Environment variable name
        default: Default value if not set (optional)
        required: If True, raises RuntimeError if variable not set
        
    Returns:
        str: Environment variable value
        
    Raises:
        RuntimeError: If required=True and variable is not set
    """
    value = os.getenv(name, default)
    
    if required and not value:
        raise RuntimeError(
            f"Required environment variable {name} is not set. "
            f"Please set it in your .env file or environment."
        )
    
    return value


def get_env_int(name: str, default: int = None, required: bool = False) -> int:
    """
    Get an environment variable as an integer.
    
    Args:
        name: Environment variable name
        default: Default value if not set (optional)
        required: If True, raises RuntimeError if variable not set
        
    Returns:
        int: Environment variable value as integer
        
    Raises:
        RuntimeError: If required=True and variable is not set
        ValueError: If value cannot be converted to integer
    """
    value = os.getenv(name)
    
    if value is None:
        if required:
            raise RuntimeError(
                f"Required environment variable {name} is not set. "
                f"Please set it in your .env file or environment."
            )
        return default
    
    try:
        return int(value)
    except ValueError:
        raise ValueError(
            f"Environment variable {name}={value} cannot be converted to integer. "
            f"Please provide a valid integer value."
        )


def get_env_float(name: str, default: float = None, required: bool = False) -> float:
    """
    Get an environment variable as a float.
    
    Args:
        name: Environment variable name
        default: Default value if not set (optional)
        required: If True, raises RuntimeError if variable not set
        
    Returns:
        float: Environment variable value as float
        
    Raises:
        RuntimeError: If required=True and variable is not set
        ValueError: If value cannot be converted to float
    """
    value = os.getenv(name)
    
    if value is None:
        if required:
            raise RuntimeError(
                f"Required environment variable {name} is not set. "
                f"Please set it in your .env file or environment."
            )
        return default
    
    try:
        return float(value)
    except ValueError:
        raise ValueError(
            f"Environment variable {name}={value} cannot be converted to float. "
            f"Please provide a valid numeric value."
        )


# For convenience, expose commonly used environment variables as module-level functions
def get_gemini_api_key() -> str:
    """Get GEMINI_API_KEY (required)"""
    return get_env_var('GEMINI_API_KEY', required=True)


def get_gemini_model() -> str:
    """Get GEMINI_MODEL (default: gemini-1.5-flash)"""
    return get_env_var('GEMINI_MODEL', default='gemini-1.5-flash')


def get_python_service_url() -> str:
    """Get PYTHON_SERVICE_URL (default: http://localhost:5001)"""
    return get_env_var('PYTHON_SERVICE_URL', default='http://localhost:5001')


def get_cache_ttl() -> int:
    """Get CACHE_TTL in seconds (default: 3600)"""
    return get_env_int('CACHE_TTL', default=3600)


def get_cache_max_size() -> int:
    """Get CACHE_MAX_SIZE (default: 100)"""
    return get_env_int('CACHE_MAX_SIZE', default=100)


def get_relevance_threshold() -> float:
    """Get RELEVANCE_THRESHOLD (default: 0.3)"""
    return get_env_float('RELEVANCE_THRESHOLD', default=0.3)


if __name__ == '__main__':
    # If run directly, perform validation and print results
    validate_and_exit_on_failure()
