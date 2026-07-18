# Phase 9 — Backend Quality and Security Audit

Audit date: 2026-07-18.

## Quality gate

Run the complete backend gate from `frontend`:

```powershell
npm run test:backend
```

It covers PDF ingestion, Gemini embeddings, hybrid retrieval, grounded answer
generation, chat persistence, analytics, feedback, API security, TypeScript,
and Drizzle schema consistency.

Live provider/database evaluations remain separate because they consume remote
resources:

```powershell
npm run evaluate:retrieval
npm run evaluate:rag
```

## Implemented controls

### Request boundary

- JSON POST endpoints require `Content-Type: application/json`.
- Declared bodies above 16 KiB are rejected before parsing.
- Browser cross-site requests are rejected using `Origin` and
  `Sec-Fetch-Site`.
- Zod bounds all UUID, message, feedback, name, and email input.
- API responses include `nosniff`, frame denial, restrictive referrer, and
  permissions-policy headers.

### Provider boundary

- Gemini API keys are server-only.
- Gemini embedding and generation requests use a 15-second abort signal.
- Transient provider failures have bounded retry counts and backoff.
- Raw provider responses, embeddings, full documents, and secrets are not
  returned or logged.
- Generation receives only bounded retrieved context.

### Abuse controls

- Chat rate limits use persisted user messages in Neon.
- Feedback rate limits use persisted submissions in Neon.
- Prompt injection and out-of-domain questions stop before Gemini.
- Public statistics expose aggregate counts only.

### Data integrity

- Visitor UUID has a unique database index.
- Document content hashes prevent duplicate ingestion.
- Document/chunk foreign keys cascade only derived chunks.
- Assistant errors are persisted with a safe user-facing message.
- Retrieval only reads active, ready documents with embeddings.

## Dependency audit

`npm audit --omit=dev --audit-level=high` reports no high or critical
production vulnerability. Moderate findings currently come from the
Next.js/PostCSS dependency tree. `npm audit fix --force` is intentionally not
used because it proposes a breaking Next.js downgrade.

## Residual risks and next actions

- Anonymous users can rotate UUIDs to bypass application-level limits.
  Production should additionally use Vercel Firewall/WAF rate limiting.
- A `Content-Length` check is defense-in-depth; the deployment platform must
  also enforce request size limits.
- CSP for the final one-page UI will be added with the frontend because its
  allowed scripts/styles depend on the final asset set.
- The old Express/Python/LangChain/Chroma backend still increases repository
  size and dependency exposure. It is removed only after this new backend gate
  is stable in Phase 10.
- Full `next build` is currently blocked by the legacy chat page. Phase 10/11
  removes that obsolete UI rather than patching its old multi-RAG behavior.

## Audit conclusion

The new TypeScript backend is ready for legacy-backend removal. Its remote
dependencies are Neon and Gemini only, and it no longer needs Python,
LangChain, ChromaDB, or an Express gateway for the final architecture.
