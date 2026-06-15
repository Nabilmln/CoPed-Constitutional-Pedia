"""
CoPed FastAPI Service - Persistent RAG Service Architecture
Eliminates cold-start latency by loading RAG systems once at startup.
"""

import os
import sys
import time
import re
from datetime import datetime
from typing import Optional, List, Literal
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator, Field
import uvicorn

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Import RAG systems
try:
    from dataset_builder import DatasetBuilder
    NATIVE_RAG_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Native RAG not available: {e}", file=sys.stderr)
    NATIVE_RAG_AVAILABLE = False

try:
    from langchain_enhanced_rag import LangChainEnhancedRAG
    LANGCHAIN_RAG_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ LangChain RAG not available: {e}", file=sys.stderr)
    LANGCHAIN_RAG_AVAILABLE = False

# Core Gemini API
try:
    import google.generativeai as genai
    GEMINI_API_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Gemini API not available: {e}", file=sys.stderr)
    GEMINI_API_AVAILABLE = False


# =============================================================================
# Pydantic Models
# =============================================================================

class QueryRequest(BaseModel):
    """Request model for RAG queries"""
    question: str = Field(..., description="The constitutional law question to ask")
    rag_type: Literal["native", "langchain", "auto"] = Field(
        default="auto",
        description="RAG system to use: native (96.8% accuracy), langchain (89.2% accuracy), or auto-select"
    )
    model: Literal["gemini-1.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"] = Field(
        default="gemini-1.5-flash",
        description="Gemini model to use for generation"
    )
    
    @validator('question')
    def question_not_empty(cls, v):
        """Validate question is not empty"""
        if not v or not v.strip():
            raise ValueError('Question cannot be empty')
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "question": "Apa isi Pasal 1 ayat 1 UUD 1945?",
                "rag_type": "auto",
                "model": "gemini-1.5-flash"
            }
        }


class SourceReference(BaseModel):
    """Source reference with citation details"""
    pasal_ayat: str = Field(..., description="Pasal/Ayat reference (e.g., 'Pasal 1 Ayat 1')")
    preview: str = Field(..., description="Text preview from the source")
    relevance_score: float = Field(..., description="Relevance score (0.0 to 1.0)")
    chunk_id: Optional[int] = Field(None, description="Chunk identifier if available")
    
    class Config:
        schema_extra = {
            "example": {
                "pasal_ayat": "Pasal 1 Ayat 1",
                "preview": "Negara Indonesia ialah Negara Kesatuan yang berbentuk Republik...",
                "relevance_score": 0.95,
                "chunk_id": 12
            }
        }


class QueryResponse(BaseModel):
    """Response model for RAG queries"""
    answer: str = Field(..., description="Generated answer based on constitutional documents")
    system: str = Field(..., description="RAG system used (native/langchain/auto_selected)")
    accuracy: float = Field(..., description="Expected accuracy percentage")
    response_time: int = Field(..., description="Response time in milliseconds")
    sources: List[SourceReference] = Field(default_factory=list, description="Source citations")
    gemini_model: str = Field(..., description="Gemini model used")
    cached: bool = Field(default=False, description="Whether response was cached")
    fallback: bool = Field(default=False, description="Whether fallback mode was used")
    
    class Config:
        schema_extra = {
            "example": {
                "answer": "Berdasarkan Pasal 1 Ayat 1 UUD 1945, Negara Indonesia adalah Negara Kesatuan yang berbentuk Republik.",
                "system": "native",
                "accuracy": 96.8,
                "response_time": 850,
                "sources": [
                    {
                        "pasal_ayat": "Pasal 1 Ayat 1",
                        "preview": "Negara Indonesia ialah Negara Kesatuan yang berbentuk Republik...",
                        "relevance_score": 0.95,
                        "chunk_id": 12
                    }
                ],
                "gemini_model": "gemini-1.5-flash",
                "cached": False,
                "fallback": False
            }
        }


class HealthResponse(BaseModel):
    """Health check response with service metrics"""
    status: Literal["healthy", "degraded"] = Field(..., description="Service health status")
    uptime: int = Field(..., description="Service uptime in seconds")
    total_queries: int = Field(..., description="Total queries processed")
    average_response_time: float = Field(..., description="Average response time in milliseconds")
    error_count: int = Field(..., description="Total error count")
    vector_db_status: bool = Field(..., description="ChromaDB vector database connection status")
    gemini_api_status: bool = Field(..., description="Gemini API connection status")
    
    class Config:
        schema_extra = {
            "example": {
                "status": "healthy",
                "uptime": 3600,
                "total_queries": 150,
                "average_response_time": 850.5,
                "error_count": 2,
                "vector_db_status": True,
                "gemini_api_status": True
            }
        }


# =============================================================================
# Global State
# =============================================================================

# RAG system singletons - loaded once at startup
native_rag: Optional[DatasetBuilder] = None
langchain_rag: Optional[LangChainEnhancedRAG] = None

# Service statistics - tracked globally
service_stats = {
    "uptime_start": 0,  # Will be set in startup
    "total_queries": 0,
    "total_response_time": 0.0,
    "error_count": 0
}


# =============================================================================
# Lifecycle Management
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Handles RAG system initialization and graceful cleanup.
    """
    # --- STARTUP ---
    global native_rag, langchain_rag, service_stats
    
    print("\n" + "="*60)
    print("🚀 COPED FASTAPI SERVICE STARTING")
    print("="*60)
    
    # Record startup time
    service_stats["uptime_start"] = time.time()
    
    # 1. Validate environment variables
    print("\n📋 Step 1: Validating environment variables...")
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        error_msg = (
            "GEMINI_API_KEY environment variable not set. "
            "Service cannot start without API key. "
            "Please set GEMINI_API_KEY in your .env file."
        )
        print(f"❌ {error_msg}", file=sys.stderr)
        raise RuntimeError(error_msg)
    
    print(f"✅ GEMINI_API_KEY loaded: {api_key[:10]}...")
    
    # Load optional environment variables with defaults
    gemini_model = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
    python_service_url = os.getenv('PYTHON_SERVICE_URL', 'http://localhost:5001')
    print(f"✅ GEMINI_MODEL: {gemini_model}")
    print(f"✅ PYTHON_SERVICE_URL: {python_service_url}")
    
    # 2. Configure Gemini API
    print("\n📋 Step 2: Configuring Gemini API...")
    if GEMINI_API_AVAILABLE:
        try:
            genai.configure(api_key=api_key)
            print("✅ Gemini API configured successfully")
        except Exception as e:
            print(f"⚠️ Error configuring Gemini API: {e}", file=sys.stderr)
    else:
        print("⚠️ Gemini API library not available", file=sys.stderr)
    
    # 3. Initialize Native RAG
    print("\n📋 Step 3: Initializing Native RAG system...")
    if NATIVE_RAG_AVAILABLE:
        try:
            native_rag = DatasetBuilder()
            dataset = native_rag.build_combined_dataset()
            if dataset:
                print(f"✅ Native RAG initialized successfully")
                print(f"   📚 Documents: {dataset['metadata']['total_documents']}")
                print(f"   📏 Characters: {dataset['metadata']['total_chars']:,}")
            else:
                print("⚠️ Native RAG dataset build failed", file=sys.stderr)
                native_rag = None
        except Exception as e:
            print(f"⚠️ Native RAG initialization failed: {e}", file=sys.stderr)
            native_rag = None
    else:
        print("⚠️ Native RAG not available (import failed)", file=sys.stderr)
    
    # 4. Initialize LangChain Enhanced RAG
    print("\n📋 Step 4: Initializing LangChain Enhanced RAG system...")
    if LANGCHAIN_RAG_AVAILABLE:
        try:
            langchain_rag = LangChainEnhancedRAG()
            
            # Load and process documents
            print("   📚 Loading constitutional documents...")
            documents, files = langchain_rag.load_and_process_documents()
            
            if documents:
                print(f"   ✅ Loaded {len(documents)} document chunks from {len(files)} files")
                
                # Build vector database
                print("   🔍 Building vector database...")
                langchain_rag.build_vector_database(documents)
                
                # Setup QA chain
                print("   ⚙️ Setting up QA chain...")
                langchain_rag.setup_qa_chain()
                
                print("✅ LangChain RAG initialized successfully")
                print(f"   📊 Vector DB chunks: {langchain_rag.vectorstore._collection.count()}")
            else:
                print("⚠️ LangChain RAG failed to load documents", file=sys.stderr)
                langchain_rag = None
        except Exception as e:
            print(f"⚠️ LangChain RAG initialization failed: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            langchain_rag = None
    else:
        print("⚠️ LangChain RAG not available (import failed)", file=sys.stderr)
    
    # 5. Startup summary
    print("\n" + "="*60)
    print("✅ FASTAPI SERVICE READY")
    print("="*60)
    print(f"   Native RAG: {'✅ Available' if native_rag else '❌ Not Available'}")
    print(f"   LangChain RAG: {'✅ Available' if langchain_rag else '❌ Not Available'}")
    print(f"   Gemini API: {'✅ Available' if GEMINI_API_AVAILABLE else '❌ Not Available'}")
    
    uptime = time.time() - service_stats["uptime_start"]
    print(f"   Startup time: {uptime:.2f} seconds")
    print("="*60 + "\n")
    
    # Yield control to FastAPI app
    yield
    
    # --- SHUTDOWN ---
    print("\n" + "="*60)
    print("🛑 COPED FASTAPI SERVICE SHUTTING DOWN")
    print("="*60)
    
    # Cleanup resources
    print("📋 Cleaning up resources...")
    
    # Add any cleanup logic here if needed
    # For now, just log shutdown stats
    total_uptime = time.time() - service_stats["uptime_start"]
    avg_response_time = (
        service_stats["total_response_time"] / service_stats["total_queries"]
        if service_stats["total_queries"] > 0
        else 0
    )
    
    print(f"   Total uptime: {total_uptime:.2f} seconds")
    print(f"   Total queries: {service_stats['total_queries']}")
    print(f"   Average response time: {avg_response_time:.2f} ms")
    print(f"   Total errors: {service_stats['error_count']}")
    
    print("✅ Graceful shutdown complete")
    print("="*60 + "\n")


# =============================================================================
# FastAPI Application
# =============================================================================

app = FastAPI(
    title="CoPed RAG Service",
    description="Persistent FastAPI service for constitutional law RAG queries with optimized performance",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on ALLOWED_ORIGINS env var in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/")
async def root():
    """Root endpoint - service information"""
    return {
        "service": "CoPed FastAPI RAG Service",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "query": "/api/query",
            "stream": "/api/query/stream"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint with service metrics.
    
    Returns:
        HealthResponse: Service health status and metrics
    """
    # Calculate uptime
    uptime = int(time.time() - service_stats["uptime_start"])
    
    # Calculate average response time
    avg_response_time = (
        service_stats["total_response_time"] / service_stats["total_queries"]
        if service_stats["total_queries"] > 0
        else 0.0
    )
    
    # Check subsystem health
    vector_db_ok = langchain_rag is not None and hasattr(langchain_rag, 'vectorstore') and langchain_rag.vectorstore is not None
    gemini_ok = test_gemini_api_connection()
    
    # Determine overall status
    status = "healthy" if (vector_db_ok and gemini_ok) else "degraded"
    
    return HealthResponse(
        status=status,
        uptime=uptime,
        total_queries=service_stats["total_queries"],
        average_response_time=avg_response_time,
        error_count=service_stats["error_count"],
        vector_db_status=vector_db_ok,
        gemini_api_status=gemini_ok
    )


# =============================================================================
# Helper Functions for /api/query
# =============================================================================

def validate_legal_context(question: str) -> tuple[bool, str]:
    """
    Validate if the question contains constitutional/legal context.
    Matches logic in api_bridge.py
    """
    legal_keywords = [
        'uud', 'undang-undang dasar', 'konstitusi', 'pasal', 'ayat', 'bab',
        'presiden', 'mpr', 'dpr', 'mahkamah', 'kedaulatan', 'negara kesatuan',
        'republik', 'hak asasi', 'pancasila', 'amandemen', 'pemerintahan'
    ]
    
    non_legal_keywords = [
        'komputer', 'software', 'programming', 'game', 'film', 'musik',
        'sepak bola', 'makanan', 'resep', 'bisnis', 'marketing'
    ]
    
    question_lower = question.lower()
    
    # Check for non-legal content
    if any(keyword in question_lower for keyword in non_legal_keywords):
        return False, "non_legal_content"
    
    # Check for legal content
    if any(keyword in question_lower for keyword in legal_keywords):
        return True, "legal_content_found"
    
    # Minimal context check
    constitutional_terms = ['negara', 'rakyat', 'indonesia', 'aturan', 'hukum']
    if any(term in question_lower for term in constitutional_terms):
        return True, "constitutional_context"
    
    return False, "insufficient_legal_context"


def auto_select_rag(question: str) -> str:
    """
    Auto select best RAG system based on question content with legal validation.
    Returns "native", "langchain", or "legal_context_filter".
    """
    is_legal, _ = validate_legal_context(question)
    
    if not is_legal:
        return "legal_context_filter"
    
    # If is legal, determine best engine based on keywords
    legal_keywords = ['pasal', 'undang', 'konstitusi', 'hukum', 'peraturan', 'uud', 'ayat']
    question_lower = question.lower()
    
    if any(keyword in question_lower for keyword in legal_keywords):
        # Use Native RAG for direct legal/pasal questions for highest accuracy
        return "native"
    else:
        # Use LangChain RAG for other conceptual constitutional questions
        return "langchain"


def extract_source_references(retrieved_docs: List, relevance_scores: dict = None) -> List[SourceReference]:
    """
    Extract Pasal/Ayat references from document metadata or content.
    Creates preview text (first 100 characters) and includes relevance scores.
    Returns a list of SourceReference objects.
    """
    sources = []
    
    # Map documents to scores if available
    chunk_scores = {}
    if relevance_scores and "chunk_scores" in relevance_scores:
        for chunk, score in relevance_scores["chunk_scores"]:
            if hasattr(chunk, 'page_content'):
                chunk_scores[chunk.page_content] = score
            else:
                chunk_scores[str(chunk)] = score
                
    for doc in retrieved_docs:
        # Handle both LangChain Document and dict
        if hasattr(doc, 'page_content'):
            content = doc.page_content
            metadata = doc.metadata if hasattr(doc, 'metadata') else {}
        elif isinstance(doc, dict):
            content = doc.get('content') or doc.get('page_content') or str(doc)
            metadata = doc.get('metadata') or doc
        else:
            content = str(doc)
            metadata = {}
            
        # Extract score
        score = chunk_scores.get(content, 0.5)
        if 'relevance_score' in metadata:
            score = metadata['relevance_score']
        elif 'score' in metadata:
            score = metadata['score']
        elif 'combined_score' in metadata:
            score = metadata['combined_score']
        elif 'semantic_score' in metadata:
            score = metadata['semantic_score']
            
        # Extract Pasal and Ayat from metadata or text
        pasal_val = metadata.get('pasal_number')
        ayat_val = metadata.get('ayat_number')
        
        if pasal_val is None:
            pasal_match = re.search(r'[Pp]asal\s+(\d+)', content)
            if pasal_match:
                pasal_val = int(pasal_match.group(1))
                
        if ayat_val is None:
            # Look for "ayat (1)" or "(1)"
            ayat_match = re.search(r'[Aa]yat\s*\(?(\d+)\)?|^\s*\((\d+)\)', content, re.MULTILINE)
            if ayat_match:
                g1, g2 = ayat_match.groups()
                ayat_val = int(g1 or g2)
                
        # Format citation reference
        if pasal_val is not None and ayat_val is not None:
            pasal_ayat = f"Pasal {pasal_val} Ayat {ayat_val}"
        elif pasal_val is not None:
            pasal_ayat = f"Pasal {pasal_val}"
        elif 'source_file' in metadata:
            pasal_ayat = metadata['source_file']
        elif 'file' in metadata:
            pasal_ayat = metadata['file']
        else:
            pasal_ayat = "UUD 1945"
            
        # Preview text (first 100 characters)
        preview = content[:100]
        if len(content) > 100:
            preview += "..."
            
        chunk_id = metadata.get('chunk_id')
        
        ref = SourceReference(
            pasal_ayat=pasal_ayat,
            preview=preview,
            relevance_score=float(score),
            chunk_id=chunk_id
        )
        sources.append(ref)
        
    return sources


@app.post("/api/query", response_model=QueryResponse)
async def query_endpoint(request: QueryRequest):
    """
    POST endpoint for non-streaming RAG queries.
    Routes queries to the appropriate RAG engine, runs anti-hallucination checks,
    and returns a structured QueryResponse.
    """
    global native_rag, langchain_rag, service_stats
    
    start_time = time.time()
    service_stats["total_queries"] += 1
    
    try:
        question = request.question.strip()
        selected_model = request.model
        rag_type = request.rag_type
        
        # 1. Handle auto selection
        actual_rag_type = rag_type
        if rag_type == "auto":
            actual_rag_type = auto_select_rag(question)
            
        # 2. Check for legal context filter
        if actual_rag_type == "legal_context_filter":
            elapsed_ms = int((time.time() - start_time) * 1000)
            service_stats["total_response_time"] += elapsed_ms
            
            warning_msg = (
                "Maaf, saya merupakan AI Assistant Ahli Hukum Konstitusi Indonesia. "
                "Saya tidak dapat menjawab pertanyaan di luar konteks hukum yang Anda ajukan.\n\n"
                "⚖️ **Keahlian saya meliputi:**\n"
                "• Undang-Undang Dasar 1945\n"
                "• Sistem ketatanegaraan Indonesia\n"
                "• Hak dan kewajiban konstitusional\n"
                "• Lembaga-lembaga negara\n"
                "• Proses amandemen UUD 1945\n\n"
                "💡 **Contoh pertanyaan yang dapat saya bantu jawab:**\n"
                "• \"Apa isi pembukaan UUD 1945?\"\n"
                "• \"Bagaimana checks and balances dalam UUD 1945?\"\n"
                "• \"Apa saja hak asasi manusia yang dijamin konstitusi?\""
            )
            
            return QueryResponse(
                answer=warning_msg,
                system="legal_context_filter",
                accuracy=0.0,
                response_time=elapsed_ms,
                sources=[],
                gemini_model="context_validator",
                cached=False,
                fallback=True
            )
            
        # 3. Route to Native RAG
        if actual_rag_type == "native":
            if not native_rag:
                raise HTTPException(status_code=503, detail="Native RAG system is not initialized/available")
                
            # Swap model dynamically
            native_rag.model = genai.GenerativeModel(selected_model)
            
            # Execute query
            result = native_rag.answer_question_document_by_document(question)
            
            if isinstance(result, str):
                raise Exception(f"Native RAG processing error: {result}")
                
            answer = result.get('answer', '')
            
            # Extract source references
            sources = []
            for doc_ans in result.get('individual_answers', []):
                content = doc_ans['answer']
                pasal_val = None
                ayat_val = None
                pasal_match = re.search(r'[Pp]asal\s+(\d+)', content)
                if pasal_match:
                    pasal_val = int(pasal_match.group(1))
                ayat_match = re.search(r'[Aa]yat\s*\(?(\d+)\)?', content)
                if ayat_match:
                    ayat_val = int(ayat_match.group(1))
                    
                if pasal_val is not None and ayat_val is not None:
                    pasal_ayat = f"Pasal {pasal_val} Ayat {ayat_val}"
                elif pasal_val is not None:
                    pasal_ayat = f"Pasal {pasal_val}"
                else:
                    pasal_ayat = doc_ans['source']
                    
                sources.append(SourceReference(
                    pasal_ayat=pasal_ayat,
                    preview=content[:100] + ("..." if len(content) > 100 else ""),
                    relevance_score=1.0,
                    chunk_id=None
                ))
                
            # Run citation validation
            citation_val = validate_citation(answer)
            if not citation_val["passed"]:
                answer = citation_val["message"]
                
            elapsed_ms = int((time.time() - start_time) * 1000)
            service_stats["total_response_time"] += elapsed_ms
            
            return QueryResponse(
                answer=answer,
                system="native",
                accuracy=96.8,
                response_time=elapsed_ms,
                sources=sources,
                gemini_model=selected_model,
                cached=False,
                fallback=False
            )
            
        # 4. Route to LangChain RAG
        elif actual_rag_type == "langchain":
            if not langchain_rag:
                raise HTTPException(status_code=503, detail="LangChain RAG system is not initialized/available")
                
            # Retrieve documents using enhanced search
            retrieved_docs = langchain_rag.enhanced_constitutional_search(question, k=12)
            
            if not retrieved_docs:
                retrieved_docs = langchain_rag.vectorstore.similarity_search(question, k=8)
                
            # Calculate relevance scores
            relevance_scores = calculate_relevance_score(retrieved_docs, question)
            
            # Validate relevance threshold
            threshold_val = validate_relevance_threshold(relevance_scores, question)
            
            if not threshold_val["passed"]:
                elapsed_ms = int((time.time() - start_time) * 1000)
                service_stats["total_response_time"] += elapsed_ms
                return QueryResponse(
                    answer=threshold_val["message"],
                    system="langchain",
                    accuracy=89.2,
                    response_time=elapsed_ms,
                    sources=[],
                    gemini_model=selected_model,
                    cached=False,
                    fallback=True
                )
                
            # Generate answer using selected model
            context_text = "\n\n".join([doc.page_content for doc in retrieved_docs])
            prompt_text = build_constitutional_prompt(context_text, question)
            
            model = genai.GenerativeModel(selected_model)
            response = model.generate_content(prompt_text)
            answer = response.text.strip()
            
            # Validate citations
            citation_val = validate_citation(answer)
            if not citation_val["passed"]:
                answer = citation_val["message"]
                
            # Extract source references
            sources = extract_source_references(retrieved_docs, relevance_scores)
            
            elapsed_ms = int((time.time() - start_time) * 1000)
            service_stats["total_response_time"] += elapsed_ms
            
            return QueryResponse(
                answer=answer,
                system="langchain",
                accuracy=89.2,
                response_time=elapsed_ms,
                sources=sources,
                gemini_model=selected_model,
                cached=False,
                fallback=False
            )
            
        else:
            raise HTTPException(status_code=400, detail=f"Invalid RAG type selection: {rag_type}")
            
    except Exception as e:
        service_stats["error_count"] += 1
        print(f"❌ Error in /api/query endpoint: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan internal saat memproses kueri: {str(e)}"
        )


def build_constitutional_prompt(context: str, question: str) -> str:
    """
    Build anti-hallucination prompt for constitutional queries.
    
    This function creates a carefully structured prompt that:
    1. Constrains the AI to ONLY use provided UUD 1945 context
    2. Requires fallback message for unanswerable queries
    3. Mandates citation of specific Pasal and Ayat
    4. Formats context and question clearly
    
    Args:
        context (str): Retrieved constitutional text from UUD 1945
        question (str): User's constitutional law question
    
    Returns:
        str: Formatted prompt with anti-hallucination constraints
    
    Requirements:
        - Requirement 3.1: Anti-hallucination constraint in prompt
        - Task 6.1: Build constitutional prompt function
    """
    return f"""Anda adalah AI assistant ahli hukum konstitusi Indonesia. 

INSTRUKSI PENTING:
- Jawab HANYA menggunakan informasi dari konteks UUD 1945 berikut
- Jika jawaban tidak ditemukan dalam konteks, jawab: "Maaf, informasi tersebut tidak ditemukan dalam dokumen UUD 1945 yang tersedia."
- Wajib sebutkan pasal dan ayat spesifik dalam jawaban Anda

KONTEKS UUD 1945:
{context}

PERTANYAAN: {question}

JAWABAN:"""


def calculate_relevance_score(retrieved_chunks: List, question: str) -> dict:
    """
    Calculate relevance scores for retrieved constitutional chunks.
    
    This function computes:
    1. Individual relevance score for each retrieved Constitutional_Chunk
    2. Average relevance across all retrieved chunks
    3. Highest relevance score (most relevant chunk)
    
    The relevance score is based on metadata if available (from vector search),
    or computed using a simple text similarity heuristic.
    
    Args:
        retrieved_chunks (List): List of retrieved document chunks (with metadata)
        question (str): User's constitutional law question
    
    Returns:
        dict: Dictionary containing:
            - chunk_scores: List of (chunk, score) tuples
            - average_relevance: Average relevance across all chunks
            - highest_relevance: Highest individual relevance score
            - metadata: Additional scoring information
    
    Requirements:
        - Requirement 3.3: Compute relevance score for retrieved chunks
        - Task 6.2: Implement relevance score calculation
    
    Examples:
        >>> chunks = [chunk1, chunk2, chunk3]
        >>> result = calculate_relevance_score(chunks, "Apa bentuk negara Indonesia?")
        >>> result['average_relevance']
        0.85
        >>> result['highest_relevance']
        0.92
    """
    if not retrieved_chunks:
        return {
            "chunk_scores": [],
            "average_relevance": 0.0,
            "highest_relevance": 0.0,
            "metadata": {"total_chunks": 0}
        }
    
    chunk_scores = []
    question_lower = question.lower()
    
    for chunk in retrieved_chunks:
        # Try to get relevance score from chunk metadata (if available from vector search)
        if hasattr(chunk, 'metadata') and isinstance(chunk.metadata, dict):
            # Check for pre-computed relevance score
            if 'relevance_score' in chunk.metadata:
                score = chunk.metadata['relevance_score']
            elif 'score' in chunk.metadata:
                score = chunk.metadata['score']
            else:
                # Compute simple text overlap score
                score = compute_text_similarity(chunk.page_content if hasattr(chunk, 'page_content') else str(chunk), question_lower)
        else:
            # Fallback: compute simple text similarity
            content = chunk.page_content if hasattr(chunk, 'page_content') else str(chunk)
            score = compute_text_similarity(content, question_lower)
        
        chunk_scores.append((chunk, score))
    
    # Calculate statistics
    scores = [score for _, score in chunk_scores]
    average_relevance = sum(scores) / len(scores) if scores else 0.0
    highest_relevance = max(scores) if scores else 0.0
    
    return {
        "chunk_scores": chunk_scores,
        "average_relevance": average_relevance,
        "highest_relevance": highest_relevance,
        "metadata": {
            "total_chunks": len(retrieved_chunks),
            "scores_distribution": {
                "min": min(scores) if scores else 0.0,
                "max": highest_relevance,
                "mean": average_relevance
            }
        }
    }


def compute_text_similarity(text: str, question: str) -> float:
    """
    Compute simple text similarity score between chunk content and question.
    
    Uses keyword overlap and length normalization as a basic similarity metric.
    This is a fallback when vector similarity scores are not available.
    
    Args:
        text (str): Chunk content text
        question (str): Question text (lowercased)
    
    Returns:
        float: Similarity score between 0.0 and 1.0
    """
    text_lower = text.lower()
    
    # Extract keywords from question (words longer than 3 characters)
    question_keywords = [w for w in question.split() if len(w) > 3]
    
    if not question_keywords:
        return 0.5  # Default neutral score for very short questions
    
    # Count keyword matches
    matches = sum(1 for keyword in question_keywords if keyword in text_lower)
    
    # Normalize by number of keywords
    keyword_score = matches / len(question_keywords)
    
    # Boost score if text contains exact question phrase
    if question in text_lower:
        keyword_score = min(1.0, keyword_score + 0.3)
    
    return keyword_score


def validate_relevance_threshold(relevance_scores: dict, question: str) -> dict:
    """
    Validate retrieved chunks against relevance threshold.
    
    This function enforces anti-hallucination by rejecting queries where
    the retrieved constitutional text is not sufficiently relevant to the
    question. When relevance is below threshold, it returns a not-found message
    instead of allowing the LLM to potentially hallucinate an answer.
    
    Args:
        relevance_scores (dict): Output from calculate_relevance_score()
        question (str): User's question for logging
    
    Returns:
        dict: Validation result containing:
            - passed (bool): Whether validation passed
            - highest_relevance (float): Highest relevance score found
            - threshold (float): Threshold value used
            - message (str): Not-found message if validation failed
            - should_proceed (bool): Whether to proceed with answer generation
    
    Requirements:
        - Requirement 3.4: Check relevance threshold and return not-found message
        - Requirement 14.7: Load RELEVANCE_THRESHOLD from environment
        - Task 6.3: Add relevance threshold validation
    
    Examples:
        >>> scores = {"highest_relevance": 0.85, "average_relevance": 0.75}
        >>> result = validate_relevance_threshold(scores, "Test question")
        >>> result['passed']
        True
        >>> result['should_proceed']
        True
    """
    # Load threshold from environment with default 0.3
    threshold = float(os.getenv('RELEVANCE_THRESHOLD', '0.3'))
    
    highest_relevance = relevance_scores.get('highest_relevance', 0.0)
    
    # Check if highest relevance score is below threshold
    if highest_relevance < threshold:
        # Log low-relevance query for analysis
        print(f"⚠️ Low relevance query detected:", file=sys.stderr)
        print(f"   Question: {question[:100]}...", file=sys.stderr)
        print(f"   Highest relevance: {highest_relevance:.3f}", file=sys.stderr)
        print(f"   Threshold: {threshold:.3f}", file=sys.stderr)
        
        return {
            "passed": False,
            "highest_relevance": highest_relevance,
            "threshold": threshold,
            "message": "Maaf, informasi tersebut tidak ditemukan dalam dokumen UUD 1945 yang tersedia.",
            "should_proceed": False
        }
    
    return {
        "passed": True,
        "highest_relevance": highest_relevance,
        "threshold": threshold,
        "message": "",
        "should_proceed": True
    }


def validate_citation(response_text: str) -> dict:
    """
    Validate that response contains constitutional citations (Pasal/Ayat references).
    
    This function enforces anti-hallucination by ensuring the AI response includes
    at least one citation to specific constitutional articles. Responses without
    citations are rejected to prevent hallucinated or unsupported answers.
    
    Recognizes citation patterns:
    - "Pasal X" (e.g., "Pasal 1", "Pasal 28")
    - "Pasal X Ayat Y" (e.g., "Pasal 1 Ayat 1")
    - "Pasal X ayat (Y)" (e.g., "Pasal 1 ayat (1)")
    - "Pasal X huruf Y" (e.g., "Pasal 28A huruf a")
    
    Args:
        response_text (str): Generated response text from LLM
    
    Returns:
        dict: Validation result containing:
            - passed (bool): Whether validation passed
            - citations_found (List[str]): List of citation strings found
            - citation_count (int): Number of citations found
            - message (str): Not-found message if validation failed
            - should_accept (bool): Whether to accept the response
    
    Requirements:
        - Requirement 3.5: Validate at least one citation exists
        - Requirement 3.6: Reject responses without citations
        - Task 6.4: Implement citation validation
    
    Examples:
        >>> response = "Berdasarkan Pasal 1 Ayat 1 UUD 1945, negara Indonesia..."
        >>> result = validate_citation(response)
        >>> result['passed']
        True
        >>> result['citation_count']
        1
        
        >>> response = "Indonesia adalah negara yang besar."
        >>> result = validate_citation(response)
        >>> result['passed']
        False
    """
    import re
    
    # Regex patterns for constitutional citations
    citation_patterns = [
        r'Pasal\s+\d+[A-Z]?\s+[Aa]yat\s+\(?\d+\)?',  # Pasal X Ayat Y or Pasal X ayat (Y)
        r'Pasal\s+\d+[A-Z]?\s+huruf\s+[a-z]',          # Pasal X huruf y
        r'Pasal\s+\d+[A-Z]?',                          # Pasal X
    ]
    
    citations_found = []
    
    for pattern in citation_patterns:
        matches = re.findall(pattern, response_text, re.IGNORECASE)
        citations_found.extend(matches)
    
    # Remove duplicates while preserving order
    citations_found = list(dict.fromkeys(citations_found))
    
    citation_count = len(citations_found)
    
    if citation_count == 0:
        # No citations found - reject response
        print(f"⚠️ Response rejected: No constitutional citations found", file=sys.stderr)
        print(f"   Response preview: {response_text[:150]}...", file=sys.stderr)
        
        return {
            "passed": False,
            "citations_found": [],
            "citation_count": 0,
            "message": "Maaf, informasi tersebut tidak ditemukan dalam dokumen UUD 1945 yang tersedia.",
            "should_accept": False
        }
    
    # Citations found - accept response
    return {
        "passed": True,
        "citations_found": citations_found,
        "citation_count": citation_count,
        "message": "",
        "should_accept": True
    }


def test_gemini_api_connection() -> bool:
    """
    Test if Gemini API is accessible.
    
    Returns:
        bool: True if API is accessible, False otherwise
    """
    if not GEMINI_API_AVAILABLE:
        return False
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content("Test")
        return bool(response.text)
    except Exception as e:
        print(f"⚠️ Gemini API connection test failed: {e}", file=sys.stderr)
        return False


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    """
    Run the FastAPI service with uvicorn.
    
    Configuration:
        - Host: 127.0.0.1 (localhost only for security)
        - Port: 5001 (FastAPI service port)
        - Reload: False (disabled in production for stability)
        - Log level: info
    """
    print("\n🚀 Starting CoPed FastAPI Service on port 5001...")
    print("📋 Service URL: http://127.0.0.1:5001")
    print("📋 Health check: http://127.0.0.1:5001/health")
    print("📋 API docs: http://127.0.0.1:5001/docs\n")
    
    uvicorn.run(
        "python_service:app",
        host="127.0.0.1",
        port=5001,
        reload=False,  # Disable reload in production
        log_level="info",
        access_log=True
    )
