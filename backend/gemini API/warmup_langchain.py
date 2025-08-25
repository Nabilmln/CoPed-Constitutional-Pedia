#!/usr/bin/env python3
"""
LangChain RAG Warm-up Script
Pre-initialize LangChain RAG system untuk menghindari timeout pada first request
"""

import sys
import time
import os

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

try:
    from api_bridge import initialize_langchain_rag
    
    print("🔥 Starting LangChain RAG warm-up...", file=sys.stderr)
    start_time = time.time()
    
    # Initialize LangChain RAG
    rag_instance = initialize_langchain_rag()
    
    # Test with sample query
    print("🧪 Testing with sample query...", file=sys.stderr)
    test_result = rag_instance.query("Apa itu Negara Indonesia?")
    
    elapsed = time.time() - start_time
    print(f"✅ LangChain RAG warm-up completed in {elapsed:.2f}s", file=sys.stderr)
    print(f"🎯 Sample answer length: {len(test_result['answer'])} characters", file=sys.stderr)
    print("🚀 LangChain RAG ready for production use!", file=sys.stderr)
    
except Exception as e:
    print(f"❌ Warm-up failed: {e}", file=sys.stderr)
    sys.exit(1)
