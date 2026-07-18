# Legacy Backend API Contract

This document freezes the API contract exposed by the current Express and
Python RAG implementation before it is replaced by the Next.js-only backend.
It is a migration reference, not the target API.

## Base URLs

- Express API: `http://localhost:5000`
- Python RAG service: `http://localhost:5001` (internal)

The frontend should communicate with Express only. Direct Python service access
is an implementation detail of the legacy architecture.

## Express endpoints

### `GET /`

Returns service metadata and the available primary endpoints.

### `GET /api/health`

Returns Express process metrics and the current FastAPI health-monitor state.

### `POST /api/chat/rooms`

Creates an in-memory room.

Request:

```json
{
  "title": "Chat Baru"
}
```

Rooms are not persistent and disappear when the Express process restarts.

### `GET /api/chat/rooms`

Optional query parameters:

- `limit`, default `10`
- `active`, default `true`

### `GET /api/chat/rooms/:roomId/messages`

Optional query parameters:

- `limit`, default `50`
- `page`, default `1`

### `PUT /api/chat/rooms/:roomId`

Request:

```json
{
  "title": "Judul percakapan"
}
```

### `DELETE /api/chat/rooms/:roomId`

Marks the in-memory room as inactive.

### `POST /api/chat/ask`

Request:

```json
{
  "question": "Apa isi Pasal 1 ayat 1 UUD 1945?",
  "ragType": "auto",
  "model": "gemini-1.5-flash"
}
```

Legacy `ragType` values:

- `native`
- `langchain`
- `auto`

The endpoint is rate-limited to 60 requests per minute per IP.

Representative response:

```json
{
  "success": true,
  "data": {
    "answer": "...",
    "system": "native",
    "accuracy": 96.8,
    "response_time": 500,
    "sources": [],
    "gemini_model": "gemini-1.5-flash",
    "cached": false
  }
}
```

The numeric `accuracy` field is legacy metadata and must not be carried into
the target API unless it is backed by reproducible evaluation.

### `GET /api/chat/ask/stream`

Accepts `question`, `ragType`, and `model` as query parameters and returns a
Python service stream URL. This is not true same-origin streaming from Express.

### `GET /api/chat/cache/stats`

Returns process-local LRU cache statistics.

## Target contract to preserve during migration

The replacement must preserve the user-visible ability to:

1. submit one constitutional question;
2. receive a grounded Indonesian answer;
3. receive citations to relevant UUD articles/paragraphs;
4. receive a safe rejection for out-of-domain questions;
5. receive a controlled error when providers are unavailable.

Room management, RAG-engine selection, model selection, internal accuracy
claims, and Python stream URLs are explicitly not required by the target
single-page product.
