import { randomUUID } from "node:crypto";

import { getChatEnv } from "@/server/config/env";
import { answerUudQuestion } from "@/server/rag/rag.service";
import type { RagAnswer } from "@/server/rag/rag.types";

import {
  countRecentUserQuestions,
  recordAssistantAnswer,
  recordUserQuestion,
} from "./chat.repository";
import {
  ChatProcessingError,
  ChatRateLimitError,
} from "./chat.errors";
import type { ChatRequest, ChatResponse } from "./chat.types";

const SAFE_ERROR_MESSAGE =
  "Maaf, layanan chatbot sedang mengalami kendala. Silakan coba lagi.";

type ChatDependencies = {
  answerQuestion?: (question: string) => Promise<RagAnswer>;
  countRecentQuestions?: (
    sessionId: string,
    since: Date,
  ) => Promise<number>;
  saveUserQuestion?: (sessionId: string, message: string) => Promise<void>;
  saveAssistantAnswer?: (
    sessionId: string,
    answer: RagAnswer & { latencyMs: number },
  ) => Promise<void>;
  createSessionId?: () => string;
  now?: () => Date;
  rateLimitMax?: number;
  rateLimitWindowSeconds?: number;
};

export const processChatMessage = async (
  input: ChatRequest,
  dependencies: ChatDependencies = {},
): Promise<ChatResponse> => {
  const configuredChat = getChatEnv();
  const rateLimitMax =
    dependencies.rateLimitMax ?? configuredChat.CHAT_RATE_LIMIT_MAX;
  const rateLimitWindowSeconds =
    dependencies.rateLimitWindowSeconds ??
    configuredChat.CHAT_RATE_LIMIT_WINDOW_SECONDS;
  const now = dependencies.now?.() ?? new Date();
  const sessionId =
    input.sessionId ?? dependencies.createSessionId?.() ?? randomUUID();
  const countQuestions =
    dependencies.countRecentQuestions ?? countRecentUserQuestions;
  const recentQuestions = await countQuestions(
    sessionId,
    new Date(now.getTime() - rateLimitWindowSeconds * 1_000),
  );

  if (recentQuestions >= rateLimitMax) {
    throw new ChatRateLimitError(rateLimitWindowSeconds);
  }

  const saveUser = dependencies.saveUserQuestion ?? recordUserQuestion;
  const saveAssistant =
    dependencies.saveAssistantAnswer ?? recordAssistantAnswer;
  const answerQuestion = dependencies.answerQuestion ?? answerUudQuestion;

  await saveUser(sessionId, input.message);
  const startedAt = performance.now();

  try {
    const answer = await answerQuestion(input.message);
    const latencyMs = Math.round(performance.now() - startedAt);

    await saveAssistant(sessionId, { ...answer, latencyMs });

    return {
      sessionId,
      answer: answer.answer,
      status: answer.status,
      sources: answer.sources,
      provider: answer.provider,
      model: answer.model,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);

    console.error("Chat processing failed.", {
      sessionId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });

    try {
      await saveAssistant(sessionId, {
        answer: SAFE_ERROR_MESSAGE,
        status: "error",
        sources: [],
        provider: "system",
        latencyMs,
      });
    } catch (persistenceError) {
      console.error("Failed to persist controlled chat error.", {
        sessionId,
        errorType:
          persistenceError instanceof Error
            ? persistenceError.name
            : "UnknownError",
      });
    }

    throw new ChatProcessingError(sessionId, { cause: error });
  }
};
