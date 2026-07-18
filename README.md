# CoPed

CoPed adalah aplikasi edukasi UUD 1945 berbasis Retrieval-Augmented
Generation (RAG). Seluruh aplikasi berjalan sebagai satu project Next.js:
antarmuka web, API, ingestion dokumen, retrieval, dan grounded answer
generation.

## Stack

- Next.js 15 dan TypeScript
- Neon PostgreSQL dengan `pgvector`
- Drizzle ORM
- Gemini Embedding API (`gemini-embedding-001`)
- Gemini generation API
- Custom RAG pipeline tanpa Python, LangChain, Chroma, atau backend terpisah

## Struktur

```text
CoPed/
├── docs/                  dokumentasi backend dan API
└── frontend/
    ├── data/              sumber UUD 1945 untuk ingestion
    ├── drizzle/           migration database
    ├── scripts/           ingestion dan evaluasi
    └── src/
        ├── app/api/       route handlers
        └── server/        domain services dan repositories
```

## Menjalankan lokal

```bash
cd frontend
npm install
copy .env.example .env.local
npm run db:migrate
npm run ingest:uud
npm run embed:uud
npm run dev
```

Buka `http://localhost:3000`. Jangan commit `.env.local`; semua API key hanya
dibaca oleh server.

## Quality gate

```bash
cd frontend
npm run test:backend
npm run typecheck
npm run build
```

## API dan dokumentasi

- `POST /api/chat`
- `POST /api/analytics/visit`
- `GET /api/stats`
- `POST /api/feedback`

Dokumentasi lengkap:

- [Neon setup](docs/NEON_SETUP.md)
- [UUD ingestion](docs/UUD_INGESTION.md)
- [Embedding](docs/GEMINI_EMBEDDING.md)
- [Retrieval](docs/HYBRID_RETRIEVAL.md)
- [RAG generation](docs/RAG_GENERATION.md)
- [Chat API](docs/CHAT_API.md)
- [Analytics dan feedback](docs/ANALYTICS_FEEDBACK_API.md)
- [Security audit](docs/BACKEND_SECURITY_AUDIT.md)

## Deployment

Deploy folder `frontend` sebagai root project di Vercel dan tambahkan seluruh
environment variable server-side melalui dashboard Vercel. Database dikelola
oleh Neon. Ingestion dan embedding dokumen dijalankan sebagai maintenance
command, bukan pada setiap request.
