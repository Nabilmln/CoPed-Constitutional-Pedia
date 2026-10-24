# CoPed Web

Aplikasi Next.js untuk CoPed. Ringkasan proyek ada di [README utama](../README.md).

```bash
npm install
copy .env.example .env.local
npm run db:migrate
npm run dev
```

Untuk menyiapkan data UUD 1945, ikuti panduan [ingestion](../docs/UUD_INGESTION.md)
dan [embedding](../docs/GEMINI_EMBEDDING.md). Jika cache Next.js bermasalah di
OneDrive, gunakan `npm run dev:fresh`.
