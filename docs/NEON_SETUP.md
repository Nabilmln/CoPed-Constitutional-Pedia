# Neon Database Setup

Phase 2 replaces the planned Supabase database with Neon PostgreSQL. The
application uses the Neon serverless driver, Drizzle ORM, and pgvector.

## 1. Create a Neon project

Create the project in the Neon Console or through the Vercel Neon integration.
Use separate branches for production and development when both environments
are available:

- `main` for production;
- `development` for local development.

`npx neonctl@latest init` configures Neon MCP for coding assistants. It is
optional and does not replace the application connection string. Each run may
create a new Neon API key.

## 2. Configure local environment

Copy `frontend/.env.example` to `frontend/.env.local`, then replace the
placeholders:

```env
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...
```

Use the pooled URL for the Next.js application. Use the direct/unpooled URL for
migration commands. When Neon provides only one URL during early development,
the same value can temporarily be used for both.

Never prefix either variable with `NEXT_PUBLIC_` and never commit
`.env.local`.

## 3. Apply migrations

From `frontend`:

```bash
npm run db:migrate
```

The initial migration:

- enables `pgvector`;
- creates documents and 768-dimensional chunks;
- creates anonymous visitor sessions, chat messages, and feedback;
- creates `match_document_chunks` for cosine retrieval;
- creates `get_public_stats` for aggregate public counters.

The Phase 3 migration makes `document_chunks.embedding` nullable while chunks
wait for the embedding provider. Continue with [UUD_INGESTION.md](./UUD_INGESTION.md)
after applying migrations.

## 4. Verify the connection

```bash
npm run db:check
```

Expected output:

```text
Neon database connection successful. { database: '...', vectorEnabled: true }
```

The command never prints the connection string.

## 5. Useful development commands

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

Do not use `db:push` for shared or production databases. Keep database changes
as reviewed migration files.

## Current boundary

The Next.js database foundation, Node.js UUD ingestion pipeline, and Gemini
embedding pipeline are available. See `docs/UUD_INGESTION.md` and
`docs/GEMINI_EMBEDDING.md`. Hybrid retrieval is documented in
`docs/HYBRID_RETRIEVAL.md`, and grounded answer generation in
`docs/RAG_GENERATION.md`. The public Next.js endpoint and persistence contract
are documented in `docs/CHAT_API.md`. Visitor statistics and feedback are
documented in `docs/ANALYTICS_FEEDBACK_API.md`. The backend quality gate and
remaining production risks are recorded in `docs/BACKEND_SECURITY_AUDIT.md`.
