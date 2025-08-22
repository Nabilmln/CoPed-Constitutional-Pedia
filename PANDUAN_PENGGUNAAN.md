# 🚀 Panduan Menjalankan CoPed Application

## ✅ Checklist Persiapan

### 1. Verifikasi Prasyarat

- [x] Node.js terinstall (cek: `node --version`)
- [x] Python 3.11/3.12 terinstall (cek: `python --version`)
- [x] Gemini API key tersedia (opsional untuk testing)

### 2. Verifikasi File Konfigurasi

- [x] `frontend/.env.local` - ✅ Sudah dibuat
- [x] Dependencies terinstall (node_modules ada)
- [x] Authentication DISABLED - Direct access to chat

## 🎯 Cara Menjalankan Aplikasi

### Opsi 1: Menggunakan Script Otomatis (Recommended)

```bash
# Jalankan dari root directory CoPed
./start-app.bat
```

### Opsi 2: Manual (2 Terminal Terpisah)

#### Terminal 1 - Backend Server

```bash
cd "c:\Users\USER DK\OneDrive\Documents\KKP\CoPed\backend"
npm start
```

Tunggu sampai muncul pesan:

```
🚀 ================================
🚀 CoPed Backend Server Started!
🌐 Server running on port 5000
📍 Local URL: http://localhost:5000
✅ Authentication: DISABLED
💾 Storage: In-Memory (session-based)
🚀 ================================
```

#### Terminal 2 - Frontend Server

```bash
cd "c:\Users\USER DK\OneDrive\Documents\KKP\CoPed\frontend"
npm run dev
```

Tunggu sampai muncul:

```
  ▲ Next.js 15.4.6
  - Local:        http://localhost:3000
```

## 🔗 Akses Aplikasi

1. **Frontend**: http://localhost:3000 (redirect otomatis ke /chat)
2. **Backend API**: http://localhost:5000
3. **Health Check**: http://localhost:5000/api/health
4. **Direct Chat**: http://localhost:3000/chat

## 🎮 Cara Menggunakan Aplikasi

### 1. Akses Langsung

1. Buka http://localhost:3000
2. Akan redirect otomatis ke `/chat` (no login required)
3. Langsung mulai menggunakan chatbot

### 2. Navigasi Aplikasi

- **Home Page**: `/home` - Landing page dengan informasi
- **Chat Page**: `/chat` - Main chatbot interface
- **Header**: "Chat" button untuk navigasi ke chat

### 3. Menggunakan Chatbot

1. **Buat Chat Baru**: Klik "Tambahkan Chat"
2. **Pilih Model RAG**:
   - **Native**: Multi-document processing (untuk pertanyaan hukum)
   - **LangChain**: RAG framework (untuk pertanyaan umum)
3. **Kirim Pertanyaan**: Ketik di input box dan tekan Enter
4. **Lihat Response**:
   - Jawaban AI
   - Metadata (akurasi, response time, sumber, model)
   - Error handling jika ada

### 4. Manage Chat History

- **Rename Chat**: Hover → "⋯" → "Ganti nama"
- **Delete Chat**: Hover → "⋯" → "Hapus"
- **History Grouping**: Chat dikelompokkan berdasarkan tanggal
- **Session Storage**: Data tersimpan selama server berjalan

## 🤖 Sistem RAG Explained

### Auto Selection Logic

```
Pertanyaan mengandung keyword: pasal, undang, konstitusi, hukum, peraturan, UUD, ayat
├── YES → Native RAG (Gemini 2.5 Flash)
└── NO  → LangChain RAG (Gemini 1.5 Flash)
```

### Manual Selection

- **Native**: Akurasi tinggi (96.8%), response time 4-5s
- **LangChain**: Akurasi standar (63.6%), response time 2-3s

### Response Format

```json
{
  "question": "Apa itu pasal 28 UUD 1945?",
  "answer": "Detailed answer...",
  "system": "native",
  "accuracy": 96.8,
  "responseTime": 4200,
  "sources": ["UUD1945.pdf"],
  "geminiModel": "gemini-2.5-flash"
}
```

## 🐛 Troubleshooting

### Backend Issues

#### Error: "EADDRINUSE: Port 5000 already in use"

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Atau ubah port di .env
PORT=5001
```

#### Error: "Python RAG script failed"

```bash
cd "gemini API"
python --version  # Should be 3.11 or 3.12
pip install -r requirements.txt
python api_bridge.py --help  # Test script
```

### Frontend Issues

#### Error: "API connection failed"

```bash
# Check backend is running
curl http://localhost:5000/api/health

# Check .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

#### Error: "Module not found"

```bash
cd frontend
npm install
# or
rm -rf node_modules package-lock.json
npm install
```

## 📊 Development Status

### ✅ Working Features

- [x] ~~User Authentication~~ **REMOVED**
- [x] Direct Chat Access (No Login Required)
- [x] Chat Room Management (Create/Delete/Rename)
- [x] Real-time Chat Interface
- [x] RAG System Integration (Native & LangChain)
- [x] Message History Persistence (In-Memory)
- [x] Auto/Manual RAG Selection
- [x] Response Metadata Display
- [x] Error Handling & Loading States

### 🔄 Current Status

- Backend: In-memory storage (session-based)
- Frontend: Fully functional dengan real API calls
- Database: ~~MongoDB~~ **Not Required**
- Python Scripts: Ready untuk real Gemini integration

### 🚀 Production Ready Steps

1. Replace RAG simulation dengan real Gemini API calls
2. Implement persistent storage jika diperlukan
3. Add rate limiting
4. Setup production environment variables
5. Configure CDN untuk static assets

## 📱 API Testing

### Test dengan Postman/curl

```bash
# Health Check
curl http://localhost:5000/api/health

# Create Chat Room
curl -X POST http://localhost:5000/api/chat/rooms \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chat Room"}'

# Ask Question
curl -X POST http://localhost:5000/api/chat/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"Apa itu UUD 1945?","ragSystem":"native","roomId":"room-id"}'

# Get Chat Rooms
curl http://localhost:5000/api/chat/rooms
```

## 🎉 Success Indicators

### Backend Success

```
🚀 ================================
🚀 CoPed Backend Server Started!
🌐 Server running on port 5000
📍 Local URL: http://localhost:5000
🔧 Environment: development
📊 API Documentation: http://localhost:5000/api/health
✅ Authentication: DISABLED
💾 Storage: In-Memory (session-based)
🚀 ================================
```

### Frontend Success

```
  ▲ Next.js 15.4.6
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.3s
```

### Application Flow Success

1. ~~Register/Login~~ **SKIPPED** ✅
2. Direct Access to Chat ✅
3. Create Chat Room ✅
4. Send Message ✅
5. Receive AI Response ✅
6. View Message History ✅

### 🎯 Key Changes Made

- ✅ **Removed**: Authentication system completely
- ✅ **Removed**: Login/Register pages
- ✅ **Removed**: JWT tokens & user management
- ✅ **Removed**: MongoDB database dependency
- ✅ **Added**: Direct chat access
- ✅ **Added**: In-memory session storage
- ✅ **Updated**: All API endpoints are now public
- ✅ **Simplified**: Navigation flows

Happy coding! 🎉🇮🇩
