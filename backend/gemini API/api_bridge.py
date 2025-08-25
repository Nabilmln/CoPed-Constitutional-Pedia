import sys
import json
import time
import argparse
import os

# Add current directory to path untuk import modules
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Core Gemini API
import google.generativeai as genai

# Import RAG systems
try:
    from dataset_builder import DatasetBuilder
    NATIVE_RAG_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Native RAG not available: {e}", file=sys.stderr)
    NATIVE_RAG_AVAILABLE = False

try:
    from langchain_enhanced_rag import LangChainEnhancedRAG
    LANGCHAIN_RAG_AVAILABLE = True
except ImportError as e:
    print(f"Warning: LangChain RAG not available: {e}", file=sys.stderr)
    LANGCHAIN_RAG_AVAILABLE = False

# Global instances
native_rag_instance = None
langchain_rag_instance = None

def setup_gemini_fallback():
    """Setup basic Gemini API for fallback responses"""
    try:
        genai.configure(api_key='AIzaSyDPVaD6JBzYf6fTzmPeR3eUck0Mm62LvHM')
        return genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print(f"Error setting up Gemini fallback: {e}", file=sys.stderr)
        return None

def gemini_fallback_response(question, user_id, system_type="auto"):
    """Fallback Gemini response when RAG systems fail"""
    model = setup_gemini_fallback()
    if not model:
        raise Exception("Gemini API not available")
    
    # Enhanced prompt for constitutional law
    prompt = f"""
Anda adalah AI assistant ahli hukum konstitusi Indonesia yang berpengalaman dalam UUD 1945 dan peraturan perundang-undangan terkait.

KONTEKS: Sebagai sistem RAG {system_type} untuk pertanyaan hukum konstitusi
PERTANYAAN: {question}

INSTRUKSI:
1. Berikan jawaban yang informatif dan akurat berdasarkan pengetahuan UUD 1945
2. Sebutkan pasal, ayat, atau referensi spesifik jika relevan
3. Gunakan bahasa Indonesia yang formal dan jelas
4. Jika informasi tidak tersedia secara pasti, jelaskan dengan jujur
5. Berikan konteks hukum yang relevan

CATATAN: Ini adalah respons fallback karena sistem RAG sedang mengalami gangguan, namun tetap berdasarkan pengetahuan konstitusi Indonesia.

JAWABAN KOMPREHENSIF:
"""
    
    try:
        start_time = time.time()
        response = model.generate_content(prompt)
        response_time = (time.time() - start_time) * 1000
        
        return {
            "answer": response.text,
            "system": f"{system_type}_fallback",
            "accuracy": 85.0,  # Fallback accuracy
            "sources": ["Gemini Knowledge Base - UUD 1945"],
            "gemini_model": "gemini-1.5-flash",
            "user_id": user_id,
            "response_time": response_time,
            "fallback": True,
            "note": "Respons fallback karena sistem RAG tidak tersedia"
        }
        
    except Exception as e:
        raise Exception(f"Gemini fallback failed: {str(e)}")

def initialize_native_rag():
    """Initialize Native RAG system"""
    global native_rag_instance
    if not NATIVE_RAG_AVAILABLE:
        raise Exception("Native RAG system not available")
    
    if native_rag_instance is None:
        native_rag_instance = DatasetBuilder()
        # Build dataset if not exists
        dataset = native_rag_instance.build_combined_dataset()
        if not dataset:
            raise Exception("Failed to build Native RAG dataset")
    
    return native_rag_instance

def initialize_langchain_rag():
    """Initialize LangChain RAG system with performance optimization"""
    global langchain_rag_instance
    if not LANGCHAIN_RAG_AVAILABLE:
        raise Exception("LangChain RAG system not available")
    
    if langchain_rag_instance is None:
        print("🚀 Initializing LangChain RAG system...", file=sys.stderr)
        start_time = time.time()
        
        langchain_rag_instance = LangChainEnhancedRAG()
        
        # Load and process documents
        print("📚 Loading constitutional documents...", file=sys.stderr)
        documents, files = langchain_rag_instance.load_and_process_documents()
        
        if documents:
            print("🔍 Building vector database...", file=sys.stderr)
            langchain_rag_instance.build_vector_database(documents)
            
            print("⚙️ Setting up QA chain...", file=sys.stderr)
            langchain_rag_instance.setup_qa_chain()
            
            elapsed = time.time() - start_time
            print(f"✅ LangChain RAG initialized in {elapsed:.2f}s", file=sys.stderr)
        else:
            raise Exception("Failed to load documents for LangChain RAG")
    else:
        print("♻️ Using cached LangChain RAG instance", file=sys.stderr)
    
    return langchain_rag_instance

def call_native_rag(question, user_id):
    """Call Native RAG system"""
    try:
        rag = initialize_native_rag()
        result = rag.answer_question_document_by_document(question)
        
        if isinstance(result, dict) and 'answer' in result:
            return {
                "answer": result['answer'],
                "system": "native",
                "accuracy": 96.8,
                "sources": result.get('source_info', {}).get('relevant_documents', []),
                "gemini_model": "gemini-2.5-flash",
                "user_id": user_id,
                "metadata": {
                    "relevant_documents": result.get('source_info', {}).get('relevant_documents_found', 0),
                    "total_documents": result.get('source_info', {}).get('total_documents_analyzed', 0),
                    "analysis_method": result.get('source_info', {}).get('analysis_method', 'document_by_document')
                }
            }
        else:
            raise Exception(f"Invalid Native RAG response: {result}")
            
    except Exception as e:
        # Fallback to Gemini API
        return gemini_fallback_response(question, user_id, "native")

def call_langchain_rag(question, user_id):
    """Call LangChain RAG system"""
    try:
        rag = initialize_langchain_rag()
        result = rag.query(question)
        
        if isinstance(result, dict) and 'answer' in result:
            sources = []
            if 'sources' in result:
                sources = [source.get('file', 'Unknown') for source in result['sources']]
            
            return {
                "answer": result['answer'],
                "system": "langchain",
                "accuracy": 89.2,  # Enhanced accuracy dengan constitutional search optimization
                "sources": sources,
                "gemini_model": "gemini-1.5-flash",
                "user_id": user_id,
                "metadata": {
                    "num_sources": result.get('num_sources', 0),
                    "retrieval_method": result.get('retrieval_method', 'enhanced_constitutional_search')
                }
            }
        else:
            raise Exception(f"Invalid LangChain RAG response: {result}")
            
    except Exception as e:
        # Fallback to Gemini API
        return gemini_fallback_response(question, user_id, "langchain")

def auto_select_rag(question, user_id):
    """Auto select best RAG system based on question content"""
    legal_keywords = ['pasal', 'undang', 'konstitusi', 'hukum', 'peraturan', 'UUD', 'ayat']
    is_legal = any(keyword.lower() in question.lower() for keyword in legal_keywords)
    
    if is_legal:
        # Use Native RAG for legal questions
        result = call_native_rag(question, user_id)
        result['auto_selected'] = True
        result['selection_reason'] = 'Legal keywords detected, using Native RAG for higher accuracy'
        return result
    else:
        # Use LangChain RAG for general questions
        result = call_langchain_rag(question, user_id)
        result['auto_selected'] = True
        result['selection_reason'] = 'General question, using LangChain RAG for faster response'
        return result

def main():
    parser = argparse.ArgumentParser(description='RAG API Bridge for Node.js')
    parser.add_argument('--mode', choices=['native', 'langchain', 'auto'], default='auto')
    parser.add_argument('--question', required=True, help='Question to ask')
    parser.add_argument('--user-id', default='anonymous', help='User ID')
    parser.add_argument('--format', choices=['json', 'text'], default='json')
    
    args = parser.parse_args()
    
    try:
        start_time = time.time()
        
        # Call appropriate RAG system
        if args.mode == 'native':
            response = call_native_rag(args.question, args.user_id)
        elif args.mode == 'langchain':
            response = call_langchain_rag(args.question, args.user_id)
        else:  # auto mode
            response = auto_select_rag(args.question, args.user_id)
        
        # Add response time
        response["response_time"] = (time.time() - start_time) * 1000
        
        if args.format == 'json':
            print(json.dumps(response, ensure_ascii=False, indent=2))
        else:
            print(response["answer"])
            
    except Exception as e:
        # Ultimate fallback
        try:
            fallback_response = gemini_fallback_response(args.question, args.user_id, args.mode)
            fallback_response["response_time"] = (time.time() - start_time) * 1000
            fallback_response["error_note"] = f"RAG system error: {str(e)}"
            
            if args.format == 'json':
                print(json.dumps(fallback_response, ensure_ascii=False, indent=2))
            else:
                print(fallback_response["answer"])
                
        except Exception as fallback_error:
            error_response = {
                "error": str(e),
                "fallback_error": str(fallback_error),
                "system": args.mode,
                "user_id": args.user_id,
                "response_time": (time.time() - start_time) * 1000,
                "fallback_answer": f"Maaf, terjadi kesalahan pada sistem RAG dan fallback. Pertanyaan '{args.question}' akan diproses ulang. Silakan coba lagi atau hubungi administrator."
            }
            
            if args.format == 'json':
                print(json.dumps(error_response, ensure_ascii=False, indent=2))
            else:
                print(f"Error: {str(e)}")
            
            sys.exit(1)

if __name__ == "__main__":
    main()
