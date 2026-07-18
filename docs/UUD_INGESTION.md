# UUD 1945 Ingestion

The TypeScript CLI parses the local UUD 1945 PDF, repairs known extraction
anomalies, builds constitutional chunks, and stores them in Neon without
embeddings.

## Source PDF

The canonical PDF is stored at `frontend/data/UUD1945.pdf`. Its location can
be overridden in `frontend/.env.local`:

```env
UUD_PDF_PATH=./data/UUD1945.pdf
```

Without an override, the CLI reads `frontend/data/UUD1945.pdf`.

## Preview without database writes

From `frontend`:

```bash
npm run ingest:uud -- --dry-run
```

Expected baseline for the current source:

```text
totalPages: 9
totalChunks: 68
chapters: 16
articles: 37
paragraphs: 51
status: preview
```

The source PDF has two known extraction anomalies:

- `Pasal34` has no space;
- the sentence belonging to Pasal 11 is emitted earlier in PDF object order.

The constitutional chunker repairs these exact patterns and has regression
tests for both.

## Store chunks in Neon

Apply every migration first:

```bash
npm run db:migrate
```

Then ingest:

```bash
npm run ingest:uud
```

Phase 3 stores the document with `status=pending` because its chunks have not
been embedded yet. Phase 4 fills every 768-dimensional vector and marks the
document ready.

## Idempotency

The CLI computes SHA-256 from the PDF bytes.

- Same hash, default command: returns `status=skipped`.
- Same hash with `--force`: replaces existing chunks.
- Different hash: creates a new document version.

Force rebuild:

```bash
npm run ingest:uud -- --force
```

Use another local PDF:

```bash
npm run ingest:uud -- --path="C:\path\to\UUD1945.pdf"
```

## Verification

```bash
npm run test:ingestion
npm run typecheck:database
```

Database query:

```sql
select
  d.id,
  d.title,
  d.content_hash,
  d.status,
  count(c.id) as total_chunks,
  count(c.embedding) as embedded_chunks
from documents d
left join document_chunks c on c.document_id = d.id
group by d.id
order by d.created_at desc;
```

After Phase 3, `total_chunks` should be `68` and `embedded_chunks` should be
`0`.
