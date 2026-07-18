import assert from "node:assert/strict";
import test from "node:test";

import { feedbackRequestSchema } from "./feedback.validation";

test("accepts anonymous feedback with only a message", () => {
  assert.deepEqual(
    feedbackRequestSchema.parse({
      message: "Aplikasi ini sangat membantu.",
    }),
    {
      message: "Aplikasi ini sangat membantu.",
    },
  );
});

test("accepts optional valid contact information", () => {
  const result = feedbackRequestSchema.parse({
    name: "Budi",
    email: "budi@example.com",
    message: "Mohon tambahkan contoh penjelasan Pasal.",
  });

  assert.equal(result.email, "budi@example.com");
});

test("rejects invalid email and oversized feedback", () => {
  assert.equal(
    feedbackRequestSchema.safeParse({
      email: "invalid",
      message: "Pesan valid",
    }).success,
    false,
  );
  assert.equal(
    feedbackRequestSchema.safeParse({
      message: "a".repeat(1_001),
    }).success,
    false,
  );
});
