# Phase 4 — Gemini Embedding

Phase 4 converts every UUD 1945 chunk stored in Neon into a normalized
768-dimensional vector using `gemini-embedding-001`.

## Configuration

Set these server-only values in `frontend/.env.local`:

```env
GEMINI_API_KEY=your-server-only-key
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIMENSION=768
GEMINI_EMBEDDING_BATCH_SIZE=8
```

Never expose `GEMINI_API_KEY` through a `NEXT_PUBLIC_` variable or commit
`.env.local`.

The database schema uses `vector(768)`. Changing the configured dimension
requires a matching database migration and a full re-embedding.

## Run

The Phase 3 ingestion result contains a document UUID. Embed it with:

```powershell
cd frontend
npm run embed:uud -- --document-id=<DOCUMENT_UUID>
```

For the current development database:

```powershell
npm run embed:uud -- --document-id=c0266b06-b23e-4138-969e-f2436b9b789e
```

The command intentionally overwrites every chunk embedding. It is safe to run
again when the source chunks or embedding model change.

## Expected state

After all batches succeed:

- every `document_chunks.embedding` value is populated;
- `documents.status` is `ready`;
- `documents.embedding_model` is `gemini-embedding-001`;
- `documents.embedding_dimension` is `768`;
- `documents.processed_at` is populated.

If a provider request fails, the document becomes `failed` with a safe message.
The API key, full chunk text, and vector values are never logged.

## Verification

```sql
select
  d.id,
  d.status,
  d.embedding_model,
  d.embedding_dimension,
  count(c.id) as total_chunks,
  count(c.embedding) as embedded_chunks
from documents d
left join document_chunks c on c.document_id = d.id
where d.id = 'c0266b06-b23e-4138-969e-f2436b9b789e'
group by d.id;
```

The expected result is `68` total chunks and `68` embedded chunks.

## Design notes

- Document chunks use Gemini task type `RETRIEVAL_DOCUMENT`.
- Query embeddings for Phase 5 use `RETRIEVAL_QUERY`.
- This project requests 768 dimensions to reduce Neon storage and pgvector
  work.
- `gemini-embedding-001` output is normalized manually when reduced to 768
  dimensions.
- Retry with exponential backoff is limited to rate limits and transient
  provider errors.
