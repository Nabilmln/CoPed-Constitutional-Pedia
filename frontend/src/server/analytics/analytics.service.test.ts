import assert from "node:assert/strict";
import test from "node:test";

import { registerVisit } from "./analytics.service";

const SESSION_ID = "d0dc2ec5-ff16-4ad8-91df-942eb3852592";

test("registerVisit creates and persists an anonymous session", async () => {
  let persistedSession = "";
  const result = await registerVisit(undefined, {
    createSessionId: () => SESSION_ID,
    saveVisitor: async (sessionId) => {
      persistedSession = sessionId;
    },
  });

  assert.equal(result.sessionId, SESSION_ID);
  assert.equal(persistedSession, SESSION_ID);
});

test("registerVisit reuses an existing browser session", async () => {
  let persistedSession = "";
  const result = await registerVisit(SESSION_ID, {
    createSessionId: () => "must-not-be-used",
    saveVisitor: async (sessionId) => {
      persistedSession = sessionId;
    },
  });

  assert.equal(result.sessionId, SESSION_ID);
  assert.equal(persistedSession, SESSION_ID);
});
