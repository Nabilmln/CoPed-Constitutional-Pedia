# Phase 7 — Next.js Chat API

The public chatbot uses a single endpoint and does not expose room management.
The first request may omit `sessionId`; the API creates one and returns it.
The browser stores that UUID and sends it with later questions.

## POST `/api/chat`

Request:

```json
{
  "sessionId": "optional-uuid-from-an-earlier-response",
  "message": "Apa isi Pasal 1 ayat 1 UUD 1945?"
}
```

Validation:

- `sessionId` is optional but must be a UUID when supplied;
- `message` is required;
- trimmed length is 3–500 characters.

Successful grounded answer:

```json
{
  "success": true,
  "data": {
    "session_id": "d0dc2ec5-ff16-4ad8-91df-942eb3852592",
    "answer": "Berdasarkan Pasal 1 ayat (1)...",
    "status": "answered",
    "sources": [
      {
        "chunkId": "uuid",
        "articleNumber": "1",
        "paragraphNumber": "1",
        "chapter": "BAB I",
        "excerpt": "Pasal 1 ayat (1)...",
        "score": 1
      }
    ],
    "provider": "gemini",
    "model": "gemini-3.1-flash-lite"
  }
}
```

The same HTTP 200 response shape is used for controlled `rejected` and
`no_context` results. Inspect `data.status`.

## Persistence

Each accepted request:

1. upserts the anonymous UUID into `visitor_sessions`;
2. increments `question_count`;
3. stores the user message in `chat_messages`;
4. runs the guarded RAG pipeline;
5. stores the assistant response, sources, provider, model, and latency.

If the provider fails after the user message is stored, a safe assistant
message with `status = error` is persisted and the endpoint returns HTTP 503.
Provider response bodies, API keys, embeddings, and full documents are not
returned.

## Rate limit

The server counts user messages for the same session in Neon:

```env
CHAT_RATE_LIMIT_MAX=10
CHAT_RATE_LIMIT_WINDOW_SECONDS=60
```

When exceeded, the endpoint returns HTTP 429 and a `Retry-After` header. This
database-backed approach works across Vercel serverless instances. The browser
should retain one session UUID in `localStorage`; users do not see or manage a
room.

## Errors

Invalid body, HTTP 400:

```json
{
  "success": false,
  "message": "Invalid request body.",
  "details": [
    {
      "path": "message",
      "message": "message must contain at least 3 characters"
    }
  ]
}
```

Rate limit, HTTP 429:

```json
{
  "success": false,
  "message": "Terlalu banyak pertanyaan. Silakan tunggu sebelum mencoba lagi."
}
```

Controlled provider failure, HTTP 503:

```json
{
  "success": false,
  "message": "Maaf, layanan chatbot sedang mengalami kendala. Silakan coba lagi.",
  "session_id": "uuid"
}
```
