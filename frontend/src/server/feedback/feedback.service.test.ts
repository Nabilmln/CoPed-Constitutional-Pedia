import assert from "node:assert/strict";
import test from "node:test";

import { FeedbackRateLimitError } from "./feedback.errors";
import {
  readPublicTestimonials,
  submitFeedback,
} from "./feedback.service";

const SESSION_ID = "d0dc2ec5-ff16-4ad8-91df-942eb3852592";

test("feedback submission registers visitor before saving feedback", async () => {
  const events: string[] = [];
  const result = await submitFeedback(
    {
      message: "Aplikasi ini membantu memahami UUD 1945.",
    },
    {
      createSessionId: () => SESSION_ID,
      countRecent: async () => 0,
      saveVisitor: async () => {
        events.push("visitor");
      },
      saveFeedback: async (sessionId) => {
        events.push("feedback");
        assert.equal(sessionId, SESSION_ID);
        return {
          id: "feedback-id",
          status: "new",
          createdAt: new Date("2026-07-18T00:00:00.000Z"),
        };
      },
    },
  );

  assert.deepEqual(events, ["visitor", "feedback"]);
  assert.equal(result.sessionId, SESSION_ID);
  assert.equal(result.feedbackId, "feedback-id");
});

test("feedback rate limit stops before writes", async () => {
  let wroteData = false;

  await assert.rejects(
    submitFeedback(
      {
        sessionId: SESSION_ID,
        message: "Aplikasi ini membantu.",
      },
      {
        rateLimitMax: 3,
        countRecent: async () => 3,
        saveVisitor: async () => {
          wroteData = true;
        },
        saveFeedback: async () => {
          wroteData = true;
          throw new Error("must not be called");
        },
      },
    ),
    FeedbackRateLimitError,
  );

  assert.equal(wroteData, false);
});

test("public testimonials expose only presentation fields", async () => {
  const createdAt = new Date("2026-07-18T00:00:00.000Z");
  const result = await readPublicTestimonials({
    readTestimonials: async () => [
      {
        name: null,
        message: "Penjelasannya mudah dipahami.",
        createdAt,
      },
    ],
  });

  assert.deepEqual(result, [
    {
      name: "Pengguna CoPed",
      message: "Penjelasannya mudah dipahami.",
      createdAt,
    },
  ]);
});
