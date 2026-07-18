import assert from "node:assert/strict";
import test from "node:test";

import { chatRequestSchema } from "./chat.validation";

test("accepts the first chat message without a session id", () => {
  assert.deepEqual(
    chatRequestSchema.parse({
      message: "Apa isi Pasal 1 ayat 1?",
    }),
    {
      message: "Apa isi Pasal 1 ayat 1?",
    },
  );
});

test("accepts a valid existing session id", () => {
  const sessionId = "d0dc2ec5-ff16-4ad8-91df-942eb3852592";

  assert.equal(
    chatRequestSchema.parse({
      sessionId,
      message: "Apa itu UUD 1945?",
    }).sessionId,
    sessionId,
  );
});

test("rejects invalid UUIDs and oversized messages", () => {
  assert.equal(
    chatRequestSchema.safeParse({
      sessionId: "not-a-uuid",
      message: "Apa itu UUD 1945?",
    }).success,
    false,
  );
  assert.equal(
    chatRequestSchema.safeParse({
      message: "a".repeat(501),
    }).success,
    false,
  );
});
