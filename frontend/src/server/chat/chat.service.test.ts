import assert from "node:assert/strict";
import test from "node:test";

import {
  ChatProcessingError,
  ChatRateLimitError,
} from "./chat.errors";
import { processChatMessage } from "./chat.service";
import type { PersistedAssistantAnswer } from "./chat.types";

const SESSION_ID = "d0dc2ec5-ff16-4ad8-91df-942eb3852592";

test("creates a hidden session and persists user plus assistant messages", async () => {
  const events: string[] = [];
  let persistedAnswer: PersistedAssistantAnswer | undefined;
  const response = await processChatMessage(
    { message: "Apa isi Pasal 1 ayat 1?" },
    {
      createSessionId: () => SESSION_ID,
      countRecentQuestions: async () => 0,
      saveUserQuestion: async () => {
        events.push("user");
      },
      answerQuestion: async () => {
        events.push("answer");
        return {
          answer: "Indonesia adalah negara kesatuan berbentuk republik.",
          status: "answered",
          sources: [],
          provider: "gemini",
          model: "test-model",
        };
      },
      saveAssistantAnswer: async (_sessionId, answer) => {
        events.push("assistant");
        persistedAnswer = answer;
      },
    },
  );

  assert.equal(response.sessionId, SESSION_ID);
  assert.equal(response.status, "answered");
  assert.deepEqual(events, ["user", "answer", "assistant"]);
  assert.equal(persistedAnswer?.status, "answered");
  assert.ok((persistedAnswer?.latencyMs ?? -1) >= 0);
});

test("rate limit stops before messages are persisted", async () => {
  let persisted = false;

  await assert.rejects(
    processChatMessage(
      {
        sessionId: SESSION_ID,
        message: "Apa itu UUD 1945?",
      },
      {
        rateLimitMax: 10,
        countRecentQuestions: async () => 10,
        saveUserQuestion: async () => {
          persisted = true;
        },
      },
    ),
    ChatRateLimitError,
  );

  assert.equal(persisted, false);
});

test("provider failure persists a controlled assistant error", async () => {
  let persistedAnswer: PersistedAssistantAnswer | undefined;

  await assert.rejects(
    processChatMessage(
      {
        sessionId: SESSION_ID,
        message: "Apa itu UUD 1945?",
      },
      {
        countRecentQuestions: async () => 0,
        saveUserQuestion: async () => undefined,
        answerQuestion: async () => {
          throw new Error("Sensitive provider detail");
        },
        saveAssistantAnswer: async (_sessionId, answer) => {
          persistedAnswer = answer;
        },
      },
    ),
    ChatProcessingError,
  );

  assert.equal(persistedAnswer?.status, "error");
  assert.equal(persistedAnswer?.provider, "system");
  assert.doesNotMatch(
    persistedAnswer?.answer ?? "",
    /Sensitive provider detail/,
  );
});
