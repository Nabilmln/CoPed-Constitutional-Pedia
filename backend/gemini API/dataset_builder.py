"""
Dataset Builder - Menggabungkan multiple PDF menjadi satu dataset terstruktur
Dengan caching untuk performa optimal dan pembelajaran AI yang persistent
"""

import os
import json
import hashlib
from datetime import datetime
from document_cache import DocumentCache
import google.generativeai as genai

class DatasetBuilder:
    def __init__(self):
        self.cache = DocumentCache()
        self.dataset_cache_dir = "dataset_cache"
        self.combined_dataset = None
        self.setup_directories()
        self.setup_ai()
    
    def setup_directories(self):
        """Setup direktori untuk cache dataset"""
        if not os.path.exists(self.dataset_cache_dir):
            os.makedirs(self.dataset_cache_dir)
            print(f"📁 Created dataset cache directory: {self.dataset_cache_dir}")
    
    def setup_ai(self):
        """Setup AI untuk processing"""
        try:
            # Use environment variable for API key security
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                raise ValueError("GEMINI_API_KEY environment variable not set")
            
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
            print("✅ AI model initialized for dataset processing")
        except Exception as e:
            print(f"❌ Error setting up AI: {e}")
            self.model = None
    
    def discover_pdf_files(self, data_dir="data"):
        """Auto-discover semua PDF files"""
        if not os.path.exists(data_dir):
            print(f"❌ Directory {data_dir} not found")
            return []
        
        pdf_files = []
        for file in os.listdir(data_dir):
            if file.endswith('.pdf'):
                file_path = os.path.join(data_dir, file)
                file_info = {
                    "filename": file,
                    "path": file_path,
                    "size": os.path.getsize(file_path),
                    "modified": os.path.getmtime(file_path)
                }
                pdf_files.append(file_info)
        
        # Sort by size (largest first) untuk prioritas
        pdf_files.sort(key=lambda x: x['size'], reverse=True)
        
        print(f"📁 Discovered {len(pdf_files)} PDF files:")
        for file_info in pdf_files:
            print(f"  📄 {file_info['filename']} ({file_info['size']:,} bytes)")
        
        return pdf_files
    
    def generate_dataset_hash(self, pdf_files):
        """Generate unique hash untuk kombinasi file ini"""
        file_signatures = []
        for file_info in pdf_files:
            # Kombinasi nama file, size, dan modified time
            signature = f"{file_info['filename']}_{file_info['size']}_{file_info['modified']}"
            file_signatures.append(signature)
        
        combined_signature = "|".join(sorted(file_signatures))
        dataset_hash = hashlib.md5(combined_signature.encode()).hexdigest()[:12]
        return dataset_hash
    
    def check_cached_dataset(self, dataset_hash):
        """Cek apakah dataset sudah ada di cache"""
        cache_file = os.path.join(self.dataset_cache_dir, f"combined_dataset_{dataset_hash}.json")
        
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                print(f"✅ Found cached dataset: {cache_file}")
                print(f"📊 Dataset info: {cached_data['metadata']['total_documents']} docs, {cached_data['metadata']['total_chars']:,} chars")
                return cached_data
            except Exception as e:
                print(f"⚠️ Error loading cached dataset: {e}")
                return None
        
        return None
    
    def extract_and_combine_documents(self, pdf_files, max_total_chars=250000):
        """Extract dan combine semua dokumen menjadi satu dataset"""
        print(f"\n🔄 Extracting and combining {len(pdf_files)} documents...")
        print(f"📏 Character limit: {max_total_chars:,}")
        
        combined_content = []
        total_chars = 0
        processed_files = []
        
        for file_info in pdf_files:
            print(f"📄 Processing: {file_info['filename']}")
            
            # Extract dengan caching
            text = self.cache.get_document_text(file_info['path'])
            
            if text:
                # Bersihkan dan struktur teks
                cleaned_text = self.clean_document_text(text)
                char_count = len(cleaned_text)
                
                # Cek apakah masih ada ruang
                if total_chars + char_count > max_total_chars:
                    remaining_space = max_total_chars - total_chars
                    if remaining_space > 1000:  # Minimal 1000 chars
                        cleaned_text = cleaned_text[:remaining_space] + "\n[TRUNCATED]"
                        char_count = len(cleaned_text)
                    else:
                        print(f"⚠️ Skipping {file_info['filename']} - dataset size limit reached")
                        continue
                
                document_entry = {
                    "source": file_info['filename'],
                    "content": cleaned_text,
                    "char_count": char_count,
                    "word_count": len(cleaned_text.split())
                }
                
                combined_content.append(document_entry)
                total_chars += char_count
                processed_files.append(file_info['filename'])
                
                print(f"  ✅ Added {char_count:,} characters")
                
                if total_chars >= max_total_chars:
                    print(f"📏 Reached maximum dataset size ({max_total_chars:,} chars)")
                    break
            else:
                print(f"  ❌ Failed to extract text")
        
        # Gabungkan semua konten
        full_content = self.merge_document_contents(combined_content)
        
        dataset = {
            "combined_text": full_content,
            "documents": combined_content,
            "metadata": {
                "total_documents": len(combined_content),
                "total_chars": total_chars,
                "processed_files": processed_files,
                "created_at": datetime.now().isoformat(),
                "max_chars_limit": max_total_chars
            }
        }
        
        print(f"\n📊 Dataset created:")
        print(f"  📚 Documents: {len(combined_content)}")
        print(f"  📏 Total size: {total_chars:,} characters")
        print(f"  📝 Average per doc: {total_chars//len(combined_content):,} chars")
        
        return dataset
    
    def clean_document_text(self, text):
        """Bersihkan teks dokumen"""
        # Remove excessive whitespace
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            line = line.strip()
            if line and len(line) > 3:  # Skip very short lines
                cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def merge_document_contents(self, documents):
        """Merge semua document content dengan header yang jelas"""
        merged_parts = []
        
        for doc in documents:
            header = f"\n{'='*50}\nDOKUMEN: {doc['source']}\n{'='*50}\n"
            merged_parts.append(header + doc['content'])
        
        return '\n\n'.join(merged_parts)
    
    def create_intelligent_summary(self, full_text):
        """Buat ringkasan cerdas yang mempertahankan informasi penting dari semua dokumen"""
        documents = self.combined_dataset['documents']
        summarized_parts = []
        
        for doc in documents:
            # Ambil bagian penting dari setiap dokumen
            content = doc['content']
            # Prioritaskan pasal, ayat, dan aturan penting
            important_parts = []
            
            lines = content.split('\n')
            for line in lines:
                line = line.strip()
                # Cari pasal, ayat, bab yang penting
                if any(keyword in line.lower() for keyword in ['pasal', 'ayat', 'bab', 'undang-undang', 'konstitusi', 'negara']):
                    important_parts.append(line)
                elif len(line) > 50 and not line.isdigit():  # Paragraf penting
                    important_parts.append(line)
            
            # Batasi per dokumen tapi tetap representatif
            doc_summary = '\n'.join(important_parts[:50])  # Top 50 lines penting
            header = f"\n=== DOKUMEN: {doc['source']} ===\n"
            summarized_parts.append(header + doc_summary)
        
        return '\n\n'.join(summarized_parts)
    
    def save_dataset_cache(self, dataset, dataset_hash):
        """Simpan dataset ke cache"""
        cache_file = os.path.join(self.dataset_cache_dir, f"combined_dataset_{dataset_hash}.json")
        
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(dataset, f, ensure_ascii=False, indent=2)
            
            print(f"💾 Dataset cached: {cache_file}")
            print(f"📊 Cache size: {os.path.getsize(cache_file):,} bytes")
            return cache_file
            
        except Exception as e:
            print(f"❌ Error saving dataset cache: {e}")
            return None
    
    def build_combined_dataset(self, data_dir="data", force_rebuild=False):
        """Build atau load dataset gabungan"""
        print("🚀 BUILDING COMBINED DATASET")
        
        # Discover files
        pdf_files = self.discover_pdf_files(data_dir)
        if not pdf_files:
            print("❌ No PDF files found")
            return None
        
        # Generate hash untuk kombinasi files
        dataset_hash = self.generate_dataset_hash(pdf_files)
        print(f"🔑 Dataset hash: {dataset_hash}")
        
        # Cek cache jika tidak force rebuild
        if not force_rebuild:
            cached_dataset = self.check_cached_dataset(dataset_hash)
            if cached_dataset:
                self.combined_dataset = cached_dataset
                return cached_dataset
        
        # Build dataset baru
        print("\n🔨 Building new dataset...")
        dataset = self.extract_and_combine_documents(pdf_files)
        
        # Cache dataset
        cache_file = self.save_dataset_cache(dataset, dataset_hash)
        
        self.combined_dataset = dataset
        return dataset
    
    def get_dataset_summary(self):
        """Get summary dari dataset yang telah diload"""
        if not self.combined_dataset:
            return "❌ No dataset loaded"
        
        metadata = self.combined_dataset['metadata']
        summary = f"""
📊 DATASET SUMMARY
==================
📚 Total Documents: {metadata['total_documents']}
📏 Total Characters: {metadata['total_chars']:,}
📝 Average per Document: {metadata['total_chars']//metadata['total_documents']:,}
📅 Created: {metadata['created_at']}
📄 Source Files: {', '.join(metadata['processed_files'])}

🎯 Dataset ready for AI learning and question answering!
        """
        return summary
    
    def answer_question_from_dataset(self, question):
        """Jawab pertanyaan berdasarkan dataset yang sudah dipelajari"""
        if not self.combined_dataset:
            return "❌ No dataset loaded. Please build dataset first."
        
        if not self.model:
            return "❌ AI model not available"
        
        # Gunakan FULL combined text sebagai knowledge base (TIDAK di-truncate)
        knowledge_base = self.combined_dataset['combined_text']
        
        # Jika terlalu besar, gunakan intelligent chunking per dokumen
        if len(knowledge_base) > 200000:
            knowledge_base = self.create_intelligent_summary(knowledge_base)
            truncated = True
        else:
            truncated = False
        
        
        # Buat referensi dokumen yang jelas
        source_docs = self.combined_dataset['metadata']['processed_files']
        doc_count = self.combined_dataset['metadata']['total_documents']
        
        prompt = f"""
Anda adalah AI assistant ahli hukum konstitusi Indonesia yang telah mempelajari {doc_count} dokumen UUD 1945 berikut:
DOKUMEN REFERENSI: {', '.join(source_docs)}

KNOWLEDGE BASE YANG TELAH DIPELAJARI:
{knowledge_base}

INSTRUKSI PENTING:
1. Jawab pertanyaan berdasarkan pengetahuan dari SEMUA {doc_count} dokumen yang telah dipelajari
2. Berikan jawaban yang akurat dan komprehensif dengan menganalisis informasi dari berbagai dokumen
3. WAJIB sebutkan sumber dokumen spesifik (pasal, ayat, dokumen) jika relevan
4. Jika ada perbedaan atau tambahan informasi antar dokumen, jelaskan
5. Berikan referensi dokumen yang mendukung jawaban
6. Gunakan format: "Berdasarkan [nama dokumen], pasal X ayat Y..."
7. Jika informasi tidak tersedia, jelaskan dengan jujur
8. Gunakan bahasa Indonesia yang formal dan terstruktur

{"CATATAN: Knowledge base telah diringkas untuk efisiensi." if truncated else ""}

PERTANYAAN: {question}

JAWABAN KOMPREHENSIF DENGAN REFERENSI:
"""
        
        try:
            print(f"🤖 AI sedang memproses pertanyaan berdasarkan dataset yang dipelajari...")
            response = self.model.generate_content(prompt)
            
            # Add enhanced metadata dengan referensi dokumen
            result = {
                "question": question,
                "answer": response.text,
                "source_info": {
                    "dataset_documents": self.combined_dataset['metadata']['total_documents'],
                    "dataset_chars": self.combined_dataset['metadata']['total_chars'],
                    "source_files": self.combined_dataset['metadata']['processed_files'],
                    "knowledge_base_chars": len(knowledge_base),
                    "was_truncated": truncated,
                    "analysis_method": "multi_document_combined",
                    "timestamp": datetime.now().isoformat()
                },
                "document_references": source_docs
            }
            
            return result
            
        except Exception as e:
            return f"❌ Error during AI processing: {e}"
    
    def interactive_qa_mode(self):
        """Mode interaktif untuk tanya jawab dengan Individual Method sebagai default"""
        if not self.combined_dataset:
            print("❌ No dataset loaded. Building dataset first...")
            self.build_combined_dataset()
        
        if not self.combined_dataset:
            print("❌ Failed to build dataset")
            return
        
        print(self.get_dataset_summary())
        print("\n💬 NATIVE MULTI-DOC Q&A MODE (Individual Method)")
        print("Menggunakan analisis document-by-document untuk akurasi maksimal")
        print("Ketik 'quit' untuk keluar\n")
        
        while True:
            try:
                question = input("🔍 Pertanyaan: ").strip()
                
                if question.lower() in ['quit', 'exit', 'q', 'keluar']:
                    print("👋 Sampai jumpa!")
                    break
                
                if not question:
                    continue
                
                # Gunakan Individual Method sebagai default
                result = self.answer_question_document_by_document(question)
                
                if isinstance(result, dict):
                    print(f"\n📋 JAWABAN:")
                    print("=" * 60)
                    print(result['answer'])
                    print("=" * 60)
                    
                    # Enhanced source info
                    print(f"� Dokumen relevan: {result['source_info']['relevant_documents_found']}/{result['source_info']['total_documents_analyzed']}")
                    if result['source_info']['relevant_documents']:
                        print(f"📄 Sumber: {', '.join(result['source_info']['relevant_documents'])}")
                    print(f"🔍 Metode: {result['source_info']['analysis_method']}")
                    print()
                else:
                    print(f"\n❌ {result}\n")
                    
            except KeyboardInterrupt:
                print("\n👋 Sampai jumpa!")
                break
            except Exception as e:
                print(f"\n❌ Error: {e}\n")
    
    def answer_question_document_by_document(self, question):
        """Analisis pertanyaan dengan pendekatan document-by-document"""
        if not self.combined_dataset:
            return "❌ No dataset loaded. Please build dataset first."
        
        if not self.model:
            return "❌ AI model not available"
        
        print(f"🔍 Menganalisis pertanyaan dari {len(self.combined_dataset['documents'])} dokumen...")
        
        document_answers = []
        all_references = []
        
        # Analisis setiap dokumen satu per satu
        for i, doc in enumerate(self.combined_dataset['documents'], 1):
            print(f"📄 Analisis dokumen {i}/{len(self.combined_dataset['documents'])}: {doc['source']}")
            
            prompt = f"""
Anda adalah AI assistant ahli hukum konstitusi Indonesia. Analisis pertanyaan berikut berdasarkan HANYA dokumen ini:

DOKUMEN YANG DIANALISIS: {doc['source']}
KONTEN DOKUMEN:
{doc['content']}

INSTRUKSI:
1. Jawab pertanyaan berdasarkan HANYA dokumen {doc['source']} ini
2. Jika dokumen mengandung informasi relevan, berikan jawaban detail dengan referensi pasal/ayat
3. Jika dokumen TIDAK mengandung informasi relevan, jawab "TIDAK RELEVAN"
4. Sebutkan pasal, ayat, atau bagian spesifik yang mendukung jawaban
5. Gunakan format: "Berdasarkan {doc['source']}, [jawaban detail]"

PERTANYAAN: {question}

JAWABAN DARI {doc['source']}:
"""
            
            try:
                response = self.model.generate_content(prompt)
                answer_text = response.text.strip()
                
                if "TIDAK RELEVAN" not in answer_text.upper():
                    document_answers.append({
                        "source": doc['source'],
                        "answer": answer_text,
                        "char_count": len(doc['content'])
                    })
                    all_references.append(doc['source'])
                    print(f"  ✅ Menemukan informasi relevan")
                else:
                    print(f"  ➖ Tidak ada informasi relevan")
                    
            except Exception as e:
                print(f"  ❌ Error analyzing {doc['source']}: {e}")
        
        # Kombinasikan semua jawaban
        if document_answers:
            combined_answer = self.synthesize_document_answers(question, document_answers)
            
            result = {
                "question": question,
                "answer": combined_answer,
                "source_info": {
                    "analysis_method": "document_by_document",
                    "total_documents_analyzed": len(self.combined_dataset['documents']),
                    "relevant_documents_found": len(document_answers),
                    "relevant_documents": all_references,
                    "timestamp": datetime.now().isoformat()
                },
                "individual_answers": document_answers
            }
            
            return result
        else:
            return {
                "question": question,
                "answer": "❌ Tidak ditemukan informasi relevan dalam semua dokumen yang dianalisis.",
                "source_info": {
                    "analysis_method": "document_by_document",
                    "total_documents_analyzed": len(self.combined_dataset['documents']),
                    "relevant_documents_found": 0,
                    "timestamp": datetime.now().isoformat()
                }
            }
    
    def synthesize_document_answers(self, question, document_answers):
        """Sintesis jawaban dari multiple dokumen"""
        if len(document_answers) == 1:
            return document_answers[0]['answer']
        
        # Gabungkan jawaban dari multiple dokumen
        synthesis_prompt = f"""
Anda adalah AI assistant ahli hukum konstitusi Indonesia. Berikut adalah jawaban untuk pertanyaan yang sama dari beberapa dokumen berbeda:

PERTANYAAN: {question}

JAWABAN DARI DOKUMEN-DOKUMEN:
"""
        
        for i, doc_answer in enumerate(document_answers, 1):
            synthesis_prompt += f"\n{i}. DARI {doc_answer['source']}:\n{doc_answer['answer']}\n"
        
        synthesis_prompt += f"""

INSTRUKSI SINTESIS:
1. Gabungkan semua informasi dari {len(document_answers)} dokumen di atas
2. Buat jawaban komprehensif yang mengintegrasikan semua sumber
3. Sebutkan semua dokumen yang mendukung (referensi lengkap)
4. Jika ada perbedaan informasi antar dokumen, jelaskan
5. Gunakan format: "Berdasarkan analisis dari [daftar dokumen]..."
6. Struktur jawaban dengan jelas dan logis

JAWABAN TERINTEGRASI:
"""
        
        try:
            response = self.model.generate_content(synthesis_prompt)
            return response.text
        except Exception as e:
            # Fallback: gabung manual
            combined = f"Berdasarkan analisis dari {len(document_answers)} dokumen ({', '.join([d['source'] for d in document_answers])}):\n\n"
            for doc_answer in document_answers:
                combined += f"📄 {doc_answer['source']}:\n{doc_answer['answer']}\n\n"
            return combined
    
    def interactive_qa_mode_enhanced(self):
        """Mode interaktif dengan pilihan metode analisis"""
        if not self.combined_dataset:
            print("❌ No dataset loaded. Building dataset first...")
            self.build_combined_dataset()
        
        if not self.combined_dataset:
            print("❌ Failed to build dataset")
            return
        
        print(self.get_dataset_summary())
        print("\n💬 ENHANCED INTERACTIVE Q&A MODE")
        print("Pilih metode analisis:")
        print("1. 'combined' - Analisis combined dataset (cepat)")
        print("2. 'individual' - Analisis document-by-document (detail)")
        print("3. 'both' - Kedua metode (lengkap)")
        print("Ketik 'quit' untuk keluar\n")
        
        while True:
            try:
                user_input = input("🔍 [method] question atau quit: ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'q', 'keluar']:
                    print("👋 Sampai jumpa!")
                    break
                
                if not user_input:
                    continue
                
                # Parse method dan question
                parts = user_input.split(' ', 1)
                if len(parts) == 2 and parts[0] in ['combined', 'individual', 'both']:
                    method = parts[0]
                    question = parts[1]
                else:
                    method = 'combined'  # default
                    question = user_input
                
                print(f"\n📊 Menggunakan metode: {method}")
                print("=" * 60)
                
                # Process berdasarkan method
                if method == 'individual':
                    result = self.answer_question_document_by_document(question)
                elif method == 'both':
                    print("🔄 Metode 1: Combined Analysis")
                    result1 = self.answer_question_from_dataset(question)
                    print("\n🔄 Metode 2: Document-by-Document Analysis")
                    result2 = self.answer_question_document_by_document(question)
                    
                    print(f"\n📋 HASIL COMBINED METHOD:")
                    print("=" * 40)
                    if isinstance(result1, dict):
                        print(result1['answer'])
                        print(f"📊 Sumber: {result1['source_info']['dataset_documents']} dokumen")
                    
                    print(f"\n📋 HASIL INDIVIDUAL METHOD:")
                    print("=" * 40)
                    if isinstance(result2, dict):
                        print(result2['answer'])
                        print(f"📊 Dokumen relevan: {result2['source_info']['relevant_documents_found']}/{result2['source_info']['total_documents_analyzed']}")
                    
                    continue
                else:  # combined
                    result = self.answer_question_from_dataset(question)
                
                # Display result
                if isinstance(result, dict):
                    print(f"📋 JAWABAN:")
                    print(result['answer'])
                    print("=" * 60)
                    
                    if 'relevant_documents' in result['source_info']:
                        print(f"📚 Dokumen relevan: {', '.join(result['source_info']['relevant_documents'])}")
                    else:
                        print(f"📊 Sumber: {result['source_info']['dataset_documents']} dokumen")
                        
                    if 'document_references' in result:
                        print(f"📄 Referensi: {', '.join(result['document_references'])}")
                    print()
                else:
                    print(f"\n❌ {result}\n")
                    
            except KeyboardInterrupt:
                print("\n👋 Sampai jumpa!")
                break

def main():
    """Demo dataset builder"""
    print("🚀 DATASET BUILDER DEMO")
    
    builder = DatasetBuilder()
    
    # Build dataset
    print("\n📚 Building combined dataset...")
    dataset = builder.build_combined_dataset()
    
    if dataset:
        print(builder.get_dataset_summary())
        
        # Demo Q&A
        print("\n🧪 Demo Q&A...")
        test_questions = [
            "Apa isi pasal 1 ayat 1 UUD 1945?",
            "Apa yang dimaksud dengan kedaulatan rakyat?",
            "Bagaimana sistem pemerintahan menurut UUD 1945?"
        ]
        
        for question in test_questions:
            print(f"\n❓ {question}")
            result = builder.answer_question_from_dataset(question)
            if isinstance(result, dict):
                print(f"💬 {result['answer'][:200]}...")
            else:
                print(f"❌ {result}")
        
        # Interactive mode enhanced
        print(f"\n🎯 Starting enhanced interactive mode...")
        builder.interactive_qa_mode_enhanced()
    
    else:
        print("❌ Failed to build dataset")

if __name__ == "__main__":
    main()
