# Phase 11 — One-page portfolio UI

The public application is a single Next.js page with three sections.

## Section 1: information and testimonials

Desktop uses a split layout:

- the left side introduces UUD 1945 and the grounded nature of CoPed;
- the right side continuously rotates reviewed user testimonials from bottom
  to top, with wheel-like scale and fade transitions.

## Section 2: chatbot

Users do not create, select, or name rooms. On first load, the browser calls
`POST /api/analytics/visit`, stores the returned anonymous UUID in
`localStorage` under `copED_session_id`, and reuses it for chat and feedback.

Chat behavior:

- suggested questions help first-time users;
- Enter sends a message and Shift+Enter inserts a new line;
- loading, API errors, rate limits, rejected questions, and no-context answers
  remain visible in the same conversation;
- lightweight Markdown formatting renders paragraphs, emphasis, and lists
  without exposing raw `*` or `**` markers;
- grounded answers expose expandable constitutional sources;
- the message area scrolls internally so a long conversation does not stretch
  the first section;
- the UI states that CoPed only answers from UUD 1945.

The chat is a centered card whose message list scrolls internally. New
messages never call document-level `scrollIntoView`, so chatting cannot move
the page to another section.

## Section 3: public stats and testimonials

The page reads aggregate counters from `GET /api/stats`:

- unique anonymous visitors;
- persisted user questions;
- accepted feedback.

The testimonial form posts to `POST /api/feedback`. Name is optional, email is
not collected, and the message is required. It uses the same anonymous UUID as
chat. On desktop, the form is placed on the left and the project story plus
statistics on the right.

New records have status `new`. The hero's `GET /api/testimonials` endpoint
returns only records changed to `reviewed`, preventing unmoderated content from
appearing publicly.

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
