# CoPed - Constitutional Pedia Indonesia

## Panduan Instalasi dan Menjalankan Aplikasi

### Prasyarat

- Node.js (versi 18 atau lebih baru)
- Python 3.11 atau 3.12
- MongoDB Atlas account (untuk database)
- Google API Key untuk Gemini (untuk AI chatbot)

### Struktur Aplikasi

```
CoPed/
├── backend/           # Node.js Express Server
├── frontend/          # Next.js React Application
└── start-app.bat      # Script untuk menjalankan kedua aplikasi
```

### Setup Backend

1. **Masuk ke folder backend:**

   ```bash
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Setup environment variables:**
   Buat file `.env` di folder backend:

   ```env
   # Database
   MONGODB_URI=your_mongodb_atlas_connection_string

   # JWT
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRE=30d

   # CORS
   ALLOWED_ORIGINS=http://localhost:3000

   # Server
   PORT=5000
   NODE_ENV=development

   # Gemini API (optional untuk testing)
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Install Python dependencies untuk Gemini API:**

   ```bash
   cd "gemini API"
   pip install -r requirements.txt
   cd ..
   ```

5. **Jalankan backend:**
   ```bash
   npm start
   ```
   Server akan berjalan di `http://localhost:5000`

### Setup Frontend

1. **Masuk ke folder frontend:**

   ```bash
   cd frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Setup environment variables:**
   File `.env.local` sudah dibuat dengan konfigurasi:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. **Jalankan frontend:**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000`

### Menjalankan Kedua Aplikasi Sekaligus

Gunakan script yang telah disediakan:

```bash
# Windows
./start-app.bat

# Manual (buka 2 terminal)
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Fitur Aplikasi

#### 1. **Authentication System**

- Register/Login pengguna
- JWT-based authentication
- Protected routes

#### 2. **Chat System**

- Real-time chat dengan AI chatbot
- History chat disimpan di database
- Multiple chat rooms per user

#### 3. **RAG (Retrieval-Augmented Generation) System**

- **Native RAG**: Menggunakan Gemini 2.5 Flash untuk pertanyaan hukum
- **LangChain RAG**: Menggunakan Gemini 1.5 Flash untuk pertanyaan umum
- Auto-selection berdasarkan keyword analisis
- Manual selection melalui dropdown

#### 4. **Frontend Features**

- Responsive design dengan Tailwind CSS
- Real-time typing indicators
- Message metadata (akurasi, response time, sumber)
- Error handling dan loading states

### API Endpoints

#### Authentication

- `POST /api/auth/register` - Registrasi pengguna baru
- `POST /api/auth/login` - Login pengguna

#### Chat Management

- `GET /api/chat/rooms` - Ambil daftar chat rooms
- `POST /api/chat/rooms` - Buat chat room baru
- `GET /api/chat/rooms/:roomId/messages` - Ambil pesan dalam room
- `DELETE /api/chat/rooms/:roomId` - Hapus chat room

#### RAG Processing

- `POST /api/chat/ask` - Kirim pertanyaan ke sistem RAG
  ```json
  {
    "question": "Apa itu pasal 28 UUD 1945?",
    "roomId": "chat-room-id",
    "ragSystem": "native" | "langchain" | "auto"
  }
  ```

### Cara Kerja RAG System

1. **Auto Selection**:

   - Sistem menganalisis pertanyaan
   - Jika mengandung keyword hukum → Native RAG
   - Jika pertanyaan umum → LangChain RAG

2. **Manual Selection**:

   - User memilih "Native" untuk multi-doc processing
   - User memilih "LangChain" untuk RAG langchain

3. **Response Format**:
   ```json
   {
     "question": "...",
     "answer": "...",
     "system": "native|langchain",
     "accuracy": 96.8,
     "responseTime": 4200,
     "sources": ["UUD1945.pdf"],
     "geminiModel": "gemini-2.5-flash"
   }
   ```

### Troubleshooting

#### Backend Issues

1. **MongoDB Connection Error**:

   - Pastikan connection string benar
   - Check whitelist IP di MongoDB Atlas

2. **Python RAG Error**:
   - Pastikan Python dependencies terinstall
   - Check file path ke script Python

#### Frontend Issues

1. **API Connection Error**:

   - Pastikan backend berjalan di port 5000
   - Check CORS configuration

2. **Authentication Issues**:
   - Clear localStorage: `localStorage.clear()`
   - Re-login dengan kredensial yang valid

### Development Notes

- Backend menggunakan simulasi RAG untuk testing
- Untuk production, ganti simulasi dengan koneksi real ke Gemini API
- Database schema otomatis dibuat saat user pertama register
- Frontend menggunakan TypeScript untuk type safety

### Security

- JWT tokens untuk authentication
- Password hashing dengan bcrypt
- CORS protection
- Input validation dan sanitization
- Protected API routes dengan middleware

### Performance

- Database queries dioptimasi dengan indexing
- Frontend menggunakan React optimizations
- API responses di-cache where appropriate
- Image optimization dengan Next.js

Selamat menggunakan CoPed - Constitutional Pedia Indonesia! 🇮🇩
