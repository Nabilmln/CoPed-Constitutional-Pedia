import assert from "node:assert/strict";
import test from "node:test";

import { POST as registerVisit } from "@/app/api/analytics/visit/route";
import { POST as submitFeedback } from "@/app/api/feedback/route";

test("visit route rejects malformed JSON without database access", async () => {
  const response = await registerVisit(
    new Request("http://localhost/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid",
    }),
  );

  assert.equal(response.status, 400);
});

test("feedback route returns safe validation details", async () => {
  const response = await submitFeedback(
    new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-an-email",
        message: "x",
      }),
    }),
  );
  const body = (await response.json()) as {
    success: boolean;
    details: Array<{ path: string }>;
  };

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.ok(body.details.some((detail) => detail.path === "email"));
  assert.ok(body.details.some((detail) => detail.path === "message"));
});
