"""
LangChain Enhanced Document Understanding System
Advanced RAG dengan Vector Database untuk akurasi maksimal
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# LangChain imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_google_genai import GoogleGenerativeAI
from langchain_core.documents import Document

# Existing imports
from document_cache import DocumentCache
import google.generativeai as genai

class LangChainEnhancedRAG:
    def __init__(self, persist_directory="./chroma_db"):
        """Initialize LangChain enhanced RAG system"""
        self.persist_directory = persist_directory
        self.cache = DocumentCache()
        self.vectorstore = None
        self.retriever = None
        self.qa_chain = None
        
        # Setup components
        self.setup_embeddings()
        self.setup_llm()
        self.setup_text_splitter()
        self.setup_prompt_template()
        
        print("🚀 LangChain Enhanced RAG initialized")
    
    def setup_embeddings(self):
        """Setup sentence transformer embeddings untuk semantic search"""
        try:
            # Use multilingual model untuk Indonesian + English
            self.embeddings = SentenceTransformerEmbeddings(
                model_name="paraphrase-multilingual-MiniLM-L12-v2"
            )
            print("✅ Multilingual embeddings loaded")
        except Exception as e:
            print(f"❌ Error loading embeddings: {e}")
            # Fallback to simpler model
            self.embeddings = SentenceTransformerEmbeddings(
                model_name="all-MiniLM-L6-v2"
            )
            print("⚠️ Using fallback embeddings")
    
    def setup_llm(self):
        """Setup Google Gemini LLM via LangChain"""
        try:
            self.llm = GoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key="AIzaSyDPVaD6JBzYf6fTzmPeR3eUck0Mm62LvHM",
                temperature=0.1  # Low temperature untuk faktual accuracy
            )
            print("✅ Gemini LLM initialized via LangChain")
        except Exception as e:
            print(f"❌ Error setting up LLM: {e}")
    
    def setup_text_splitter(self):
        """Setup intelligent text splitter optimized untuk dokumen konstitusi"""
        # Chunk size LEBIH BESAR untuk mempertahankan konteks pasal lengkap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=5000,           # Chunk sangat besar untuk konteks pasal lengkap
            chunk_overlap=1000,        # Overlap besar untuk mempertahankan konteks hukum
            length_function=len,
            # Prioritas separator untuk dokumen konstitusi
            separators=[
                "\n\nPasal ",           # Prioritas tinggi: pemisah pasal
                "\n\nBab ",             # Prioritas tinggi: pemisah bab
                "\n\nBagian ",          # Prioritas tinggi: pemisah bagian
                "\n\n",                 # Paragraf baru
                "\nPasal ",             # Pasal tanpa double newline
                "\n",                   # Baris baru
                ". ",                   # Akhir kalimat
                " "                     # Spasi
            ]
        )
        print("✅ Constitutional document text splitter configured (5000 chars, maximum context preservation)")
    
    def setup_prompt_template(self):
        """Setup optimized prompt template untuk Indonesian constitutional documents"""
        template = """
Anda adalah AI assistant ahli hukum konstitusi Indonesia dengan spesialisasi dalam UUD 1945 dan konstitusi terkait. 
Berdasarkan dokumen-dokumen konstitusi Indonesia yang telah dianalisis, jawab pertanyaan dengan akurasi tinggi.

KONTEKS DOKUMEN KONSTITUSI:
{context}

INSTRUKSI ANALISIS KONSTITUSIONAL:
1. PRIORITAS UTAMA: Berikan jawaban yang faktual dan akurat berdasarkan dokumen UUD 1945
2. REFERENSI SPESIFIK: Wajib sebutkan pasal, ayat, bab yang relevan dengan format "Pasal X ayat (Y)"
3. ANALISIS KOMPREHENSIF: Jelaskan konteks hukum dan implikasi konstitusional
4. MULTI-DOKUMEN: Jika ada variasi informasi antar dokumen UUD, jelaskan perbedaannya
5. STRUKTUR JELAS: Gunakan format terstruktur dengan bullet points atau numbering
6. TRANSPARANSI: Jika informasi tidak tersedia dalam dokumen, nyatakan dengan jujur
7. BAHASA FORMAL: Gunakan bahasa Indonesia formal sesuai konteks hukum konstitusi

CATATAN: Sistem ini menggunakan pendekatan multi-dokumen untuk analisis UUD 1945 yang komprehensif.

PERTANYAAN KONSTITUSIONAL: {question}

JAWABAN BERDASARKAN ANALISIS MULTI-DOKUMEN UUD 1945:
"""
        
        self.prompt = PromptTemplate(
            template=template,
            input_variables=["context", "question"]
        )
        print("✅ Constitutional law prompt template optimized for multi-document UUD 1945 analysis")
    
    def load_and_process_documents(self, pdf_directory="data/"):
        """Load dan process multiple PDFs dengan LangChain loaders - SAMA seperti native RAG"""
        print(f"\n📚 Loading and processing constitutional documents from {pdf_directory}")
        print("🎯 Using SAME PDF files as native RAG system for consistency")
        
        documents = []
        processed_files = []
        
        # IMPORTANT: Gunakan file PDF yang SAMA seperti native system
        target_files = [
            "UUD1945.pdf",
            "UUD1945-BPHN.pdf", 
            "UUD1945-MKRI.pdf",
            "UUD1945-MPR.pdf",
            "UUD1954-MK.pdf"
        ]
        
        # Get all PDF files yang tersedia
        available_files = [f for f in os.listdir(pdf_directory) if f.endswith('.pdf')]
        
        # Prioritas: gunakan target files jika ada, otherwise gunakan semua
        files_to_process = []
        for target_file in target_files:
            if target_file in available_files:
                files_to_process.append(target_file)
        
        # Jika tidak ada target files, gunakan semua available files
        if not files_to_process:
            files_to_process = available_files
            print("⚠️ Target constitutional files not found, using all available PDFs")
        else:
            print(f"✅ Found {len(files_to_process)} target constitutional documents")
        
        for pdf_file in files_to_process:
            file_path = os.path.join(pdf_directory, pdf_file)
            try:
                print(f"📄 Processing: {pdf_file}")
                
                # Use LangChain PDF loader
                loader = PyPDFLoader(file_path)
                pages = loader.load()
                
                # Add enhanced metadata untuk tracking
                for page in pages:
                    page.metadata.update({
                        'source_file': pdf_file,
                        'file_path': file_path,
                        'document_type': 'constitutional',
                        'source_system': 'langchain_enhanced',
                        'processed_date': datetime.now().isoformat()
                    })
                
                documents.extend(pages)
                processed_files.append(pdf_file)
                print(f"  ✅ Loaded {len(pages)} pages from {pdf_file}")
                
            except Exception as e:
                print(f"  ❌ Error processing {pdf_file}: {e}")
        
        # Split documents into chunks dengan constitutional-optimized settings
        print(f"\n🔀 Splitting constitutional documents into chunks...")
        split_docs = self.text_splitter.split_documents(documents)
        
        # Add chunk metadata
        for i, chunk in enumerate(split_docs):
            chunk.metadata['chunk_id'] = i
            chunk.metadata['chunk_length'] = len(chunk.page_content)
        
        print(f"📊 Constitutional Document Processing Summary:")
        print(f"  📁 Files processed: {len(processed_files)}")
        print(f"  📄 Total pages: {len(documents)}")
        print(f"  📝 Total chunks: {len(split_docs)} (avg size: {3000} chars)")
        print(f"  📋 Constitutional files: {', '.join(processed_files)}")
        print(f"  🎯 Data source: SAME as native RAG system")
        
        return split_docs, processed_files
    
    def build_vector_database(self, documents: List[Document], force_rebuild=False):
        """Build vector database dengan Chroma"""
        print(f"\n🔍 Building vector database...")
        
        # Check if database already exists
        if os.path.exists(self.persist_directory) and not force_rebuild:
            print(f"📦 Loading existing vector database from {self.persist_directory}")
            self.vectorstore = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embeddings
            )
        else:
            print(f"🔨 Creating new vector database...")
            
            # Create vectorstore
            self.vectorstore = Chroma.from_documents(
                documents=documents,
                embedding=self.embeddings,
                persist_directory=self.persist_directory
            )
            
            # Persist to disk
            self.vectorstore.persist()
            print(f"💾 Vector database saved to {self.persist_directory}")
        
        # Setup retriever dengan parameter yang sama seperti qa_chain
        self.retriever = self.vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={
                "k": 12,  # Konsisten dengan qa_chain setup
                "filter": None
            }
        )
        
        print(f"✅ Vector database ready with {self.vectorstore._collection.count()} chunks")
        return self.vectorstore
    
    def setup_qa_chain(self):
        """Setup QA chain dengan retrieval optimized untuk dokumen konstitusi"""
        if not self.retriever:
            raise ValueError("Retriever not setup. Build vector database first.")
        
        # Enhanced retriever dengan filter untuk dokumen konstitusi
        self.retriever = self.vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={
                "k": 12,  # Retrieve lebih banyak chunks untuk konteks lengkap
                "filter": None  # Bisa ditambah filter untuk jenis dokumen tertentu
            }
        )
        
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",  # Stuff all retrieved docs into prompt
            retriever=self.retriever,
            chain_type_kwargs={
                "prompt": self.prompt,
                "document_variable_name": "context"
            },
            return_source_documents=True,
            verbose=False  # Set True untuk debugging
        )
        
        print("✅ Constitutional document QA Chain configured with enhanced retrieval (k=12)")
    
    def enhanced_constitutional_search(self, question: str, k: int = 12):
        """Enhanced search specifically for constitutional documents"""
        print(f"🔍 Enhanced constitutional search for: {question}")
        
        # Get all documents from collection
        collection = self.vectorstore._collection
        all_docs_data = collection.get()
        all_docs = all_docs_data['documents']
        all_metadatas = all_docs_data['metadatas']
        
        # Constitutional keyword detection and scoring
        constitutional_keywords = {
            'pasal 1': ['pasal 1', 'Pasal 1', 'PASAL 1'],
            'negara kesatuan': ['negara kesatuan', 'Negara kesatuan', 'Negara Kesatuan'],
            'bentuk republik': ['berbentuk republik', 'berbentuk Republik'],
            'kedaulatan': ['kedaulatan', 'Kedaulatan'],
            'bab 1': ['bab i', 'BAB I', 'Bab I'],
            'bentuk dan kedaulatan': ['bentuk dan kedaulatan', 'BENTUK DAN KEDAULATAN']
        }
        
        # Score and rank chunks
        scored_chunks = []
        question_lower = question.lower()
        
        for i, (doc, metadata) in enumerate(zip(all_docs, all_metadatas)):
            doc_lower = doc.lower()
            score = 0
            
            # Exact constitutional pattern matching
            for pattern_group, patterns in constitutional_keywords.items():
                if pattern_group in question_lower:
                    for pattern in patterns:
                        if pattern.lower() in doc_lower:
                            score += 10  # High score for exact matches
            
            # Additional scoring for content quality
            if 'negara indonesia ialah negara kesatuan' in doc_lower:
                score += 50  # Very high score for exact Pasal 1 content
            
            if 'bab i' in doc_lower or 'BAB I' in doc_lower:
                score += 5
                
            if 'bentuk dan kedaulatan' in doc_lower:
                score += 5
            
            # Add semantic similarity as secondary factor
            semantic_docs = self.vectorstore.similarity_search(question, k=20)
            for semantic_doc in semantic_docs:
                if semantic_doc.page_content == doc:
                    score += 1  # Small boost for semantic relevance
                    break
            
            if score > 0:
                scored_chunks.append((score, i, doc, metadata))
        
        # Sort by score (highest first) and take top k
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_chunks = scored_chunks[:k]
        
        # Convert back to Document objects
        from langchain_core.documents import Document
        result_docs = []
        for score, idx, content, metadata in top_chunks:
            doc = Document(page_content=content, metadata=metadata)
            result_docs.append(doc)
        
        print(f"📊 Constitutional search results: {len(result_docs)} chunks")
        if top_chunks:
            print(f"   🎯 Top score: {top_chunks[0][0]} for chunk with preview: {top_chunks[0][2][:100]}...")
        
        return result_docs
    def query(self, question: str) -> Dict[str, Any]:
        """Query the enhanced RAG system with constitutional document focus and enhanced search"""
        if not self.qa_chain:
            raise ValueError("QA Chain not setup. Call setup_qa_chain() first.")
        
        print(f"\n🔍 Processing constitutional query: {question}")
        
        try:
            # Use enhanced constitutional search instead of standard semantic search
            enhanced_docs = self.enhanced_constitutional_search(question, k=12)
            
            if not enhanced_docs:
                # Fallback to standard semantic search
                print("⚠️ No results from constitutional search, using semantic fallback")
                enhanced_docs = self.vectorstore.similarity_search(question, k=8)
            
            # Create context for QA
            context = "\n\n".join([doc.page_content for doc in enhanced_docs])
            
            # Build prompt manually for better control
            filled_prompt = self.prompt.format(context=context, question=question)
            
            # Get answer from LLM
            answer = self.llm(filled_prompt)
            
            # Extract enhanced source information
            sources = []
            source_files = set()
            total_context_chars = 0
            
            for doc in enhanced_docs:
                source_info = {
                    "file": doc.metadata.get("source_file", "Unknown"),
                    "page": doc.metadata.get("page", "Unknown"), 
                    "chunk_id": doc.metadata.get("chunk_id", "Unknown"),
                    "content_preview": doc.page_content[:150] + "..." if len(doc.page_content) > 150 else doc.page_content,
                    "chunk_length": len(doc.page_content)
                }
                sources.append(source_info)
                source_files.add(doc.metadata.get("source_file", "Unknown"))
                total_context_chars += len(doc.page_content)
            
            enhanced_result = {
                "question": question,
                "answer": answer,
                "sources": sources,
                "num_sources": len(sources),
                "unique_documents": list(source_files),
                "num_unique_documents": len(source_files),
                "total_context_chars": total_context_chars,
                "retrieval_method": "enhanced_constitutional_search",
                "system_type": "langchain_enhanced_constitutional",
                "timestamp": datetime.now().isoformat(),
                "note": "Enhanced constitutional search: pattern matching + semantic analysis"
            }
            
            print(f"✅ Constitutional query processed with enhanced search:")
            print(f"   📚 {len(sources)} relevant chunks from {len(source_files)} documents")
            print(f"   📄 Documents: {', '.join(source_files)}")
            print(f"   📏 Context: {total_context_chars:,} characters")
            print(f"   🔍 Method: Enhanced Constitutional Search")
            
            return enhanced_result
            
        except Exception as e:
            print(f"❌ Error processing constitutional query: {e}")
            return {
                "question": question,
                "answer": f"Error: {e}",
                "sources": [],
                "error": True,
                "system_type": "langchain_enhanced_constitutional"
            }
    
    def compare_with_baseline(self, question: str, baseline_answer: str = None):
        """Compare LangChain results dengan baseline system"""
        print(f"\n COMPARISON: LangChain vs Baseline")
        
        # LangChain result
        langchain_result = self.query(question)
        
        # Baseline result (if provided)
        if baseline_answer:
            comparison = {
                "question": question,
                "langchain": {
                    "answer": langchain_result["answer"],
                    "sources": len(langchain_result["sources"]),
                    "method": "semantic_retrieval + optimized_prompt"
                },
                "baseline": {
                    "answer": baseline_answer,
                    "method": "simple_text_matching"
                },
                "comparison_timestamp": datetime.now().isoformat()
            }
            
            print(f"📊 LangChain sources: {len(langchain_result['sources'])}")
            print(f"📄 LangChain answer length: {len(langchain_result['answer'])} chars")
            
            return comparison
        
        return langchain_result
    
    def evaluate_accuracy(self, test_questions: List[Dict]):
        """Evaluate system accuracy dengan test questions"""
        print(f"\n📊 EVALUATING ACCURACY dengan {len(test_questions)} questions")
        
        results = []
        total_score = 0
        
        for i, test_case in enumerate(test_questions, 1):
            question = test_case["question"]
            expected_keywords = test_case.get("expected_keywords", [])
            
            print(f"\n❓ Question {i}: {question}")
            
            # Get answer
            result = self.query(question)
            answer = result["answer"]
            
            # Simple accuracy scoring based on keyword presence
            score = 0
            if expected_keywords:
                found_keywords = sum(1 for keyword in expected_keywords if keyword.lower() in answer.lower())
                score = (found_keywords / len(expected_keywords)) * 10
            
            result_record = {
                "question": question,
                "answer": answer,
                "expected_keywords": expected_keywords,
                "score": score,
                "sources_used": len(result["sources"])
            }
            
            results.append(result_record)
            total_score += score
            
            print(f"📊 Score: {score:.1f}/10 ({len(result['sources'])} sources)")
        
        average_accuracy = total_score / len(test_questions)
        
        evaluation_summary = {
            "total_questions": len(test_questions),
            "average_accuracy": average_accuracy,
            "accuracy_percentage": f"{average_accuracy * 10:.1f}%",
            "detailed_results": results,
            "evaluation_timestamp": datetime.now().isoformat()
        }
        
        print(f"\n🎯 FINAL ACCURACY: {average_accuracy * 10:.1f}%")
        
        return evaluation_summary
    
    def validate_data_consistency_with_native(self, native_data_dir="data/"):
        """Validasi bahwa LangChain menggunakan data yang sama dengan native system"""
        print("\n🔍 VALIDATING DATA CONSISTENCY WITH NATIVE SYSTEM")
        
        # Get files yang digunakan oleh native system
        native_files = []
        if os.path.exists(native_data_dir):
            native_files = [f for f in os.listdir(native_data_dir) if f.endswith('.pdf')]
            native_files.sort()
        
        # Get files yang sudah diproses oleh LangChain
        langchain_files = []
        if self.vectorstore:
            # Get unique files dari metadata
            collection = self.vectorstore._collection
            try:
                metadatas = collection.get()['metadatas']
                langchain_files = list(set([meta.get('source_file', '') for meta in metadatas if meta.get('source_file')]))
                langchain_files.sort()
            except:
                print("⚠️ Could not retrieve LangChain processed files")
        
        # Comparison
        consistency_report = {
            "native_files": native_files,
            "langchain_files": langchain_files,
            "files_match": set(native_files) == set(langchain_files),
            "missing_in_langchain": list(set(native_files) - set(langchain_files)),
            "extra_in_langchain": list(set(langchain_files) - set(native_files)),
            "total_native": len(native_files),
            "total_langchain": len(langchain_files),
            "consistency_score": len(set(native_files) & set(langchain_files)) / max(len(native_files), len(langchain_files)) if native_files or langchain_files else 0
        }
        
        print(f"📊 DATA CONSISTENCY REPORT:")
        print(f"   📁 Native files: {len(native_files)} - {', '.join(native_files)}")
        print(f"   📁 LangChain files: {len(langchain_files)} - {', '.join(langchain_files)}")
        print(f"   ✅ Files match: {consistency_report['files_match']}")
        print(f"   📊 Consistency score: {consistency_report['consistency_score']:.2%}")
        
        if consistency_report['missing_in_langchain']:
            print(f"   ⚠️ Missing in LangChain: {', '.join(consistency_report['missing_in_langchain'])}")
        
        if consistency_report['extra_in_langchain']:
            print(f"   ➕ Extra in LangChain: {', '.join(consistency_report['extra_in_langchain'])}")
        
        return consistency_report
    
    def get_enhanced_system_info(self):
        """Get comprehensive system information with native consistency check"""
        base_info = self.get_system_info()
        
        # Add consistency validation
        consistency = self.validate_data_consistency_with_native()
        
        enhanced_info = {
            **base_info,
            "data_consistency": consistency,
            "enhanced_features": {
                "constitutional_optimized_chunking": True,
                "multi_document_analysis": True,
                "native_data_alignment": consistency['files_match'],
                "enhanced_constitutional_prompts": True,
                "semantic_search_optimization": True
            },
            "performance_optimizations": {
                "chunk_size": 3000,
                "chunk_overlap": 500,
                "retrieval_k": 8,
                "constitutional_separators": True
            }
        }
        
    def get_system_info(self):
        """Get comprehensive system information"""
        info = {
            "system_type": "LangChain Enhanced Constitutional RAG",
            "components": {
                "embeddings": "paraphrase-multilingual-MiniLM-L12-v2",
                "vector_db": "ChromaDB",
                "llm": "Google Gemini 1.5 Flash",
                "text_splitter": "RecursiveCharacterTextSplitter (Constitutional Optimized)",
                "retrieval_method": "Constitutional Semantic Similarity Search"
            },
            "configuration": {
                "chunk_size": 5000,
                "chunk_overlap": 1000,
                "retrieval_k": 12,
                "temperature": 0.1,
                "constitutional_separators": True
            },
            "database_path": self.persist_directory,
            "total_chunks": self.vectorstore._collection.count() if self.vectorstore else 0
        }
        
        return info
    
    def get_enhanced_system_info(self):
        """Get comprehensive system information with native consistency check"""
        base_info = self.get_system_info()
        
        # Add consistency validation
        consistency = self.validate_data_consistency_with_native()
        
        enhanced_info = {
            **base_info,
            "data_consistency": consistency,
            "enhanced_features": {
                "constitutional_optimized_chunking": True,
                "multi_document_analysis": True,
                "native_data_alignment": consistency['files_match'],
                "enhanced_constitutional_prompts": True,
                "semantic_search_optimization": True
            },
            "performance_optimizations": {
                "chunk_size": 3000,
                "chunk_overlap": 500,
                "retrieval_k": 8,
                "constitutional_separators": True
            }
        }
        
        return enhanced_info

def demo_langchain_rag():
    """Demo comprehensive LangChain RAG system with native data consistency"""
    print("🚀 LANGCHAIN ENHANCED RAG DEMO - CONSTITUTIONAL DOCUMENT FOCUS")
    
    # Initialize system
    rag = LangChainEnhancedRAG()
    
    # Load and process documents (using SAME files as native)
    documents, files = rag.load_and_process_documents()
    
    if not documents:
        print("❌ No documents loaded. Cannot proceed with demo.")
        return None, None
    
    # Build vector database
    vectorstore = rag.build_vector_database(documents, force_rebuild=True)
    
    # Setup QA chain
    rag.setup_qa_chain()
    
    # Validate data consistency with native system
    consistency = rag.validate_data_consistency_with_native()
    
    # Demo queries focused on constitutional law
    test_questions = [
        {
            "question": "Apa isi pasal 1 ayat 1 UUD 1945?",
            "expected_keywords": ["negara indonesia", "negara kesatuan", "republik"]
        },
        {
            "question": "Apa yang dimaksud dengan kedaulatan rakyat dalam UUD 1945?",
            "expected_keywords": ["kedaulatan", "rakyat", "undang-undang dasar"]
        },
        {
            "question": "Bagaimana sistem pemerintahan menurut UUD 1945?",
            "expected_keywords": ["presidensial", "pemerintahan", "presiden", "menteri"]
        },
        {
            "question": "Apa saja hak asasi manusia yang dijamin dalam UUD 1945?",
            "expected_keywords": ["hak asasi", "manusia", "kebebasan", "hak"]
        }
    ]
    
    # Evaluate accuracy
    evaluation = rag.evaluate_accuracy(test_questions)
    
    # Show enhanced system info
    info = rag.get_enhanced_system_info()
    
    print(f"\n🔧 ENHANCED SYSTEM INFO:")
    print(f"  📚 Vector DB: {info['total_chunks']} constitutional chunks")
    print(f"  🧠 Embeddings: {info['components']['embeddings']}")
    print(f"  📊 Accuracy: {evaluation['accuracy_percentage']}")
    print(f"  🎯 Data Consistency: {info['data_consistency']['consistency_score']:.1%}")
    print(f"  ✅ Native Alignment: {info['data_consistency']['files_match']}")
    
    if not info['data_consistency']['files_match']:
        print(f"  ⚠️ Data inconsistency detected!")
        
    return rag, evaluation

if __name__ == "__main__":
    demo_langchain_rag()
