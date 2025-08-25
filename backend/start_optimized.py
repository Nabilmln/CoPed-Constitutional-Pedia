#!/usr/bin/env python3
"""
Backend Startup Script with LangChain Warm-up
Memulai backend server dan melakukan warm-up LangChain RAG di background
"""

import subprocess
import time
import sys
import os
import threading

def run_warmup():
    """Run LangChain warm-up in background"""
    try:
        print("🔥 Starting LangChain warm-up in background...")
        result = subprocess.run(
            ["python", "warmup_langchain.py"],
            cwd=os.path.join(os.path.dirname(__file__), "gemini API"),
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ LangChain warm-up completed successfully")
        else:
            print(f"⚠️ LangChain warm-up failed: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Warm-up error: {e}")

def main():
    print("🚀 Starting CoPed Backend with LangChain optimization...")
    
    # Start warm-up in background thread
    warmup_thread = threading.Thread(target=run_warmup, daemon=True)
    warmup_thread.start()
    
    print("🌐 Starting Node.js backend server...")
    
    # Start Node.js server
    try:
        subprocess.run(["node", "app.js"], cwd=os.path.dirname(__file__))
    except KeyboardInterrupt:
        print("\n🛑 Backend server stopped")
    except Exception as e:
        print(f"❌ Server error: {e}")

if __name__ == "__main__":
    main()
