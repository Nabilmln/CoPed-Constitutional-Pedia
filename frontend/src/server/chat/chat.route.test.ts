import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "@/app/api/chat/route";

test("chat route returns a controlled response for malformed JSON", async () => {
  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid",
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "Invalid JSON request body.",
  });
});

test("chat route returns validation details without touching services", async () => {
  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "x" }),
    }),
  );
  const body = (await response.json()) as {
    success: boolean;
    details: Array<{ path: string; message: string }>;
  };

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.details[0].path, "message");
});
