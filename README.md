# CoPed (Constitutional Pedia Indonesia)

Platform edukasi digital untuk memahami UUD 1945 dengan chatbot berbasis Dual RAG (Native & Enhanced) yang terintegrasi Google Gemini.

---

## Manfaat

* Pembelajaran UUD 1945 yang terstruktur dan dapat ditelusuri.
* Chatbot AI yang menjawab berdasarkan dokumen sumber.
* Dual RAG: **Native** (cepat) & **Enhanced** (lebih presisi pada kueri kompleks).
* Dukungan multi-dokumen (UUD 1945, amandemen, penjelasan).
* Multi-room chat dengan histori percakapan.

---

## ⚡️ Data Flow (Data Processing Flow)

```mermaid
flowchart TD
    A[PDF / TXT Documents] --> B[Text Extraction and Validation]
    B --> C[Intelligent Chunking: Bab/Pasal/Ayat]
    C --> D[JSON Dataset Cache + Hash MD5]
    D --> E[Combined Dataset - Native RAG]
    C --> F[Embeddings with SentenceTransformers]
    F --> G[ChromaDB - Persistent Vector Store]
```

---

## 💬 Query Flow (Query Processing Flow)

```mermaid
flowchart TD
    UQ[User Question] --> QA[Question Analysis]
    QA --> AR[Auto RAG Selection]
    AR -->|Simple| N[Native RAG - Combined Dataset]
    AR -->|Complex| E[Enhanced RAG - Vector Store]

    N --> DR[Retrieval]
    E --> DR

    DR --> GAI[Google Gemini Processing]
    GAI --> PP[Post-processing: format + sumber + metadata]
    PP --> R[Final Response to User and Save to DB]
```

---

## Tech Stack & Instalasi Singkat

**Backend:** Node.js, Express.js, Python (services), MongoDB Atlas, Google Gemini API
**Frontend:** Next.js, React, TypeScript, Tailwind CSS
**AI/RAG:** LangChain, ChromaDB, SentenceTransformers, PyPDF
**Auth/Security:** JWT, bcryptjs, CORS

### Prasyarat

* Node.js ≥ 18, Python ≥ 3.8
* Akun MongoDB Atlas
* Gemini API key

### Instalasi

```bash
# 1) Clone
git clone https://github.com/Nabilmln/CoPed-Constitutional-Pedia-.git
cd CoPed

# 2) Backend
cd backend
npm install
cd "gemini API"
pip install -r requirements.txt

# 3) Frontend
cd ../../frontend
npm install

# 4) Environment Variables Setup
# Copy .env.example files and fill in your actual values
cd ../backend
cp .env.example .env

# Edit backend/.env with your actual credentials
# REQUIRED: GEMINI_API_KEY - Get from https://makersuite.google.com/app/apikey
# REQUIRED: MONGODB_URI - Get from MongoDB Atlas Dashboard
# See "Environment Variables" section below for all variables

# Also setup Python service environment
cd "gemini API"
cp .env.example .env
# Edit with your GEMINI_API_KEY (same as backend)

# 5) Run (dev)
# Terminal A - Start Backend (Node.js on port 5000)
cd backend && npm start

# Terminal B - Start Python RAG Service (FastAPI on port 5001)
cd "backend/gemini API" && python python_service.py

# Terminal C - Start Frontend (Next.js on port 3000)
cd frontend && npm run dev

# Frontend: http://localhost:3000  |  Backend API: http://localhost:5000
```

---

## Environment Variables

The application uses environment variables for configuration and security. **Never commit your .env file to version control.**

### Required Variables

These variables **MUST** be set for the application to start:

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `GEMINI_API_KEY` | Google Gemini API key (REQUIRED) | `AIzaSy...` | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster...` | MongoDB Atlas Dashboard |
| `JWT_SECRET` | Secret key for JWT token signing | `your_32_char_secret...` | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### Optional Variables (with defaults)

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|--------------|
| `GEMINI_MODEL` | Gemini model to use | `gemini-1.5-flash` | `gemini-1.5-flash`, `gemini-2.5-flash`, `gemini-2.0-flash` |
| `PYTHON_SERVICE_URL` | FastAPI service URL | `http://localhost:5001` | Any valid URL |
| `CACHE_TTL` | Cache time-to-live (seconds) | `3600` | Any positive integer |
| `CACHE_MAX_SIZE` | Maximum cache entries | `100` | Any positive integer |
| `RELEVANCE_THRESHOLD` | Minimum relevance score (anti-hallucination) | `0.3` | `0.0` - `1.0` |
| `PORT` | Backend server port | `5000` | Any valid port number |
| `NODE_ENV` | Node environment | `development` | `development`, `production` |
| `FRONTEND_URL` | Frontend application URL | `http://localhost:3000` | Any valid URL |
| `DB_NAME` | Database name | `CoPed` | Any valid database name |
| `RAG_TIMEOUT` | RAG processing timeout (ms) | `30000` | Any positive integer |
| `MAX_CHAT_ROOMS` | Maximum concurrent chat rooms | `10` | Any positive integer |
| `DEFAULT_RAG_SYSTEM` | Default RAG system | `native` | `native`, `enhanced`, `auto` |
| `LOG_LEVEL` | Logging verbosity | `info` | `debug`, `info`, `warn`, `error` |

### Environment Setup Instructions

1. **Copy the template files:**
   ```bash
   # Backend (Node.js)
   cp backend/.env.example backend/.env
   
   # Python RAG Service
   cp "backend/gemini API/.env.example" "backend/gemini API/.env"
   ```

2. **Get your Gemini API Key:**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Create a new API key
   - Copy the key (starts with `AIza...`)

3. **Get your MongoDB connection string:**
   - Log in to [MongoDB Atlas](https://cloud.mongodb.com)
   - Go to your cluster → Connect → Connect your application
   - Copy the connection string
   - Replace `<username>`, `<password>`, and database name

4. **Edit the .env files:**
   ```bash
   # backend/.env
   GEMINI_API_KEY=AIzaSy...your-actual-key...
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/CoPed?retryWrites=true&w=majority
   JWT_SECRET=your-generated-32-character-secret-key
   
   # backend/gemini API/.env
   GEMINI_API_KEY=AIzaSy...your-actual-key...
   ```

5. **Validate your configuration:**
   ```bash
   # Test Node.js environment validation
   cd backend
   node utils/envValidator.js
   
   # Test Python environment validation
   cd "gemini API"
   python env_validator.py
   ```

### Security Best Practices

⚠️ **IMPORTANT Security Rules:**

- ✅ **DO:** Load credentials from environment variables
- ✅ **DO:** Keep `.env` files in `.gitignore`
- ✅ **DO:** Use `.env.example` with placeholder values for documentation
- ✅ **DO:** Rotate API keys regularly
- ✅ **DO:** Use different keys for development and production
- ❌ **DON'T:** Commit `.env` files to version control
- ❌ **DON'T:** Hardcode API keys in source code
- ❌ **DON'T:** Log or expose API keys in responses
- ❌ **DON'T:** Share API keys in chat, email, or documentation

### Environment Variable Validation

The application automatically validates environment variables at startup:

- **Required variables missing:** Application will fail to start with descriptive error
- **Placeholder values detected:** Warning message will be shown
- **Optional variables missing:** Default values will be used automatically

**Startup validation output example:**
```
============================================================
Environment Variable Validation
============================================================
✅ GEMINI_API_KEY: configured (key length: 39 chars)
✅ GEMINI_MODEL: gemini-1.5-flash (default)
✅ PYTHON_SERVICE_URL: http://localhost:5001 (default)
✅ CACHE_TTL: 3600 (default)
✅ CACHE_MAX_SIZE: 100 (default)
✅ RELEVANCE_THRESHOLD: 0.3 (default)

✅ Environment validation successful
============================================================
```

---

## Struktur Proyek (Ringkas)

```
CoPed/
├─ backend/
│  ├─ app.js
│  ├─ controllers/chatController.js
│  ├─ routes/chatRoutes.js
│  ├─ services/geminiServices.js
│  └─ gemini API/
│     ├─ api_bridge.py
│     ├─ dataset_builder.py          # Native RAG
│     ├─ langchain_enhanced_rag.py   # Enhanced RAG
│     ├─ document_cache.py
│     ├─ rag_selector.py
│     ├─ data/
│     ├─ cache/
│     ├─ chroma_db/
│     └─ dataset_cache/
├─ frontend/
│  ├─ src/app/(layout, page, chat, home)
│  ├─ src/components/(Header, FormattedResponse, ui)
│  ├─ src/services/api.ts
│  └─ src/lib/utils.ts
├─ start-app.bat
├─ start-app-optimized.bat
└─ README.md
```

---

## API Documentation (Ringkas)

### Chat Endpoints

#### POST `/api/chat/question`

**Body**

```json
{
  "question": "Apa isi Pasal 28A UUD 1945?",
  "ragType": "auto",  // auto | native | enhanced
  "roomId": "optional"
}
```

**Response (contoh)**

```json
{
  "success": true,
  "data": {
    "question": "Apa isi Pasal 28A UUD 1945?",
    "answer": "…",
    "ragSystem": "native",
    "responseTime": 4250,
    "sources": [
      { "file": "UUD_1945_Lengkap.pdf", "page": 15, "chunk_id": "UUD_1945_Lengkap.pdf_15" }
    ],
    "metadata": { "system_type": "native_rag", "context_chars": 245780 }
  }
}
```

### RAG Processing Endpoints

#### POST `/api/rag/native`

**Body**

```json
{ "question": "string", "user_id": "string" }
```

**Response (contoh)**

```json
{
  "answer": "…",
  "system": "native_rag",
  "response_time": 4250,
  "source_info": {
    "documents_analyzed": ["UUD_1945.pdf"],
    "total_context_chars": 245780
  }
}
```

#### POST `/api/rag/enhanced`

**Body**

```json
{ "question": "string", "user_id": "string" }
```

**Response (contoh)**

```json
{
  "answer": "…",
  "system": "langchain_enhanced",
  "response_time": 18750,
  "sources": [
    { "file": "string", "page": 1, "chunk_id": "id", "relevance_score": 0.95 }
  ],
  "performance_metrics": {
    "retrieval_time": 2.4,
    "generation_time": 15.8,
    "total_response_time": 18.2
  }
}
```

#### POST `/api/rag/auto-select`

**Body**

```json
{ "question": "string", "user_id": "string", "system_type": "auto" }
```

**Response (contoh)**

```json
{
  "answer": "…",
  "system": "native_rag" ,
  "selection_reason": "constitutional_keywords_detected",
  "confidence": 0.89,
  "response_time": 4250,
  "fallback_used": false
}
```

---

## Document Processing Pipeline (Detail Teknis)

### 1) Ingestion

* PDF → ekstraksi teks → validasi → metadata.

### 2) Constitutional-Aware Chunking

```python
separators = ["\n\nPasal ", "\n\nBab ", "\n\nBagian ", "\n\nAyat ", "\n\n"]
chunk_config = {"size": 5000, "overlap": 1000, "preserve_structure": True, "metadata_tracking": True}
```

### 3) Vector Processing (Enhanced RAG)

* Embedding: `paraphrase-multilingual-MiniLM-L12-v2` (384 dim, ID/EN).
* Storage: ChromaDB (persisten) + indeks kesamaan.

### 4) Dataset Combination (Native RAG)

* Merge semua dokumen → single knowledge base → cache JSON.
* Pelacakan sumber tetap disimpan.

### 5) Optimisasi

* Document cache, vector cache, hash-based validation, lazy loading.

---

## Kekurangan & Rencana Perbaikan

1. **Context Leakage (jawaban di luar UUD 1945)**

   * *Masalah*: Model kadang menjawab memakai pengetahuan umum.
   * *Aksi*: stricter context filtering, validation middleware sebelum tampil, prompt constraint lebih ketat.

2. **Referensi Dokumen Kurang Presisi**

   * *Masalah*: Native tidak simpan halaman spesifik; UI belum menampilkan highlight/tautan langsung.
   * *Aksi*: integrasi PDF viewer dengan highlight, click-to-source, kartu referensi yang lebih detail, ekspor sitasi.
