# Phase 8 — Analytics, Statistics, and Feedback API

These endpoints support the second section of the final one-page application.
They use the same anonymous browser UUID as the chat endpoint.

## Browser flow

On the first page load:

1. read `copED_session_id` from `localStorage`;
2. call `POST /api/analytics/visit` with the UUID when present, or `{}` when
   absent;
3. store the returned `session_id`;
4. use that UUID for `/api/chat` and `/api/feedback`.

No room UI or account is required.

## POST `/api/analytics/visit`

Request:

```json
{
  "sessionId": "optional-existing-uuid"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "session_id": "uuid"
  }
}
```

The unique index on `visitor_sessions.session_id` prevents refreshes from
inflating the visitor count. A repeated visit only updates `last_seen_at`.

## GET `/api/stats`

Response:

```json
{
  "success": true,
  "data": {
    "total_visitors": 120,
    "total_questions": 450,
    "total_feedback": 18
  }
}
```

Definitions:

- `total_visitors`: unique anonymous browser sessions;
- `total_questions`: persisted user-role chat messages;
- `total_feedback`: accepted feedback records.

The response uses a 30-second shared cache to reduce Neon reads while keeping
the public counters reasonably fresh.

## POST `/api/feedback`

Request:

```json
{
  "sessionId": "optional-browser-uuid",
  "name": "Optional name",
  "email": "optional@example.com",
  "message": "Saran atau kritik untuk aplikasi."
}
```

Validation:

- `name`: optional, 2–80 characters;
- `email`: optional, valid email, maximum 254 characters;
- `message`: required, 5–1,000 characters.

Success uses HTTP 201:

```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "feedback_id": "uuid",
    "status": "new",
    "created_at": "2026-07-18T00:00:00.000Z"
  }
}
```

Anti-spam defaults:

```env
FEEDBACK_RATE_LIMIT_MAX=3
FEEDBACK_RATE_LIMIT_WINDOW_SECONDS=86400
```

The fourth submission from the same UUID within 24 hours receives HTTP 429 and
a `Retry-After` header.

## Privacy boundary

- No IP address or user agent is stored.
- Name and email are optional.
- Public stats return aggregate counts only.
- Database connection strings and provider keys remain server-only.
