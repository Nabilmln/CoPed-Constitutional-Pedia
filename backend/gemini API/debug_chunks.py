"""
Debug script untuk mencari chunk yang mengandung Pasal 1
"""

from langchain_enhanced_rag import LangChainEnhancedRAG
from langchain_community.vectorstores import Chroma

def debug_pasal1_chunks():
    print("🔍 DEBUGGING PASAL 1 CHUNKS")
    
    # Initialize RAG
    rag = LangChainEnhancedRAG()
    
    # Load vector database
    rag.vectorstore = Chroma(
        persist_directory='./chroma_db', 
        embedding_function=rag.embeddings
    )
    
    # Get all documents from collection
    collection = rag.vectorstore._collection
    all_docs = collection.get()
    
    print(f"📊 Total chunks in database: {len(all_docs['documents'])}")
    
    # Search for Pasal 1 related content
    pasal1_chunks = []
    negara_kesatuan_chunks = []
    bentuk_kedaulatan_chunks = []
    
    for i, doc in enumerate(all_docs['documents']):
        doc_lower = doc.lower()
        
        if 'pasal 1' in doc_lower:
            pasal1_chunks.append((i, doc))
        
        if 'negara kesatuan' in doc_lower:
            negara_kesatuan_chunks.append((i, doc))
            
        if 'bentuk dan kedaulatan' in doc_lower:
            bentuk_kedaulatan_chunks.append((i, doc))
    
    print(f"📋 Chunks containing 'pasal 1': {len(pasal1_chunks)}")
    print(f"📋 Chunks containing 'negara kesatuan': {len(negara_kesatuan_chunks)}")
    print(f"📋 Chunks containing 'bentuk dan kedaulatan': {len(bentuk_kedaulatan_chunks)}")
    
    # Search for exact Pasal 1 content
    exact_pasal1_chunks = []
    for i, doc in enumerate(all_docs['documents']):
        doc_lower = doc.lower()
        if 'negara indonesia ialah negara kesatuan' in doc_lower:
            exact_pasal1_chunks.append((i, doc))
    
    print(f"📋 Chunks containing exact Pasal 1 content: {len(exact_pasal1_chunks)}")
    
    # Show exact pasal 1 chunks
    print(f"\n=== EXACT PASAL 1 CONTENT CHUNKS ===")
    for i, (chunk_id, doc) in enumerate(exact_pasal1_chunks[:5]):
        print(f"Chunk {chunk_id}:")
        print(doc[:800])
        print("---\n")
    
    # Show pasal 1 chunks
    print(f"\n=== PASAL 1 CHUNKS ===")
    for i, (chunk_id, doc) in enumerate(pasal1_chunks[:3]):
        print(f"Chunk {chunk_id}:")
        print(doc[:500])
        print("---\n")
    
    # Show negara kesatuan chunks  
    print(f"\n=== NEGARA KESATUAN CHUNKS ===")
    for i, (chunk_id, doc) in enumerate(negara_kesatuan_chunks[:3]):
        print(f"Chunk {chunk_id}:")
        print(doc[:500])
        print("---\n")

if __name__ == "__main__":
    debug_pasal1_chunks()
