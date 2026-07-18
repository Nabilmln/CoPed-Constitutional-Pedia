# Phase 11 — One-page portfolio UI

The public application is a single Next.js page with two sections.

## Section 1: information and chatbot

Desktop uses a split layout:

- the left side introduces UUD 1945 and the grounded nature of CoPed;
- the right side is the chatbot itself.

Users do not create, select, or name rooms. On first load, the browser calls
`POST /api/analytics/visit`, stores the returned anonymous UUID in
`localStorage` under `copED_session_id`, and reuses it for chat and feedback.

Chat behavior:

- suggested questions help first-time users;
- Enter sends a message and Shift+Enter inserts a new line;
- loading, API errors, rate limits, rejected questions, and no-context answers
  remain visible in the same conversation;
- grounded answers expose expandable constitutional sources;
- the UI states that CoPed only answers from UUD 1945.

## Section 2: public stats and feedback

The page reads aggregate counters from `GET /api/stats`:

- unique anonymous visitors;
- persisted user questions;
- accepted feedback.

The feedback form posts to `POST /api/feedback`. Name and email are optional;
the message is required. It uses the same anonymous UUID as chat.

## Privacy and security boundaries

- The browser never receives Neon or Gemini credentials.
- No IP address or user agent is persisted.
- Only an anonymous UUID is stored in local storage.
- Chat and feedback continue to use server-side validation and rate limiting.
- All user-visible provider failures use controlled messages.

## Responsive and accessible behavior

- The split hero becomes a stacked layout below tablet width.
- Form controls have labels and keyboard behavior.
- Chat and feedback status changes use live regions.
- Reduced-motion preferences disable nonessential animation.
- Semantic landmarks and anchor navigation cover both page sections.

## Verification

```bash
cd frontend
npm run test:backend
npm run typecheck
npm run build
```
