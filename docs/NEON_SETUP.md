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

Phase 2 defines database infrastructure only. It does not connect the legacy
Express/Python backend to Neon and does not yet ingest UUD 1945. The Next.js
repositories, ingestion script, embedding provider, and RAG API are introduced
in subsequent phases.
