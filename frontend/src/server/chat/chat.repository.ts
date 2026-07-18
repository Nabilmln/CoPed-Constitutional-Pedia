import { and, count, eq, gt, sql } from "drizzle-orm";

import { getDatabase } from "@/server/database/client";
import {
  chatMessages,
  visitorSessions,
  type ChatSource,
} from "@/server/database/schema";

import type { PersistedAssistantAnswer } from "./chat.types";

export const countRecentUserQuestions = async (
  sessionId: string,
  since: Date,
) => {
  const database = getDatabase();
  const [result] = await database
    .select({ value: count() })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.sessionId, sessionId),
        eq(chatMessages.role, "user"),
        gt(chatMessages.createdAt, since),
      ),
    );

  return result?.value ?? 0;
};

export const recordUserQuestion = async (
  sessionId: string,
  message: string,
) => {
  const database = getDatabase();
  const now = new Date();

  await database
    .insert(visitorSessions)
    .values({
      sessionId,
      questionCount: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: visitorSessions.sessionId,
      set: {
        questionCount: sql`${visitorSessions.questionCount} + 1`,
        lastSeenAt: now,
      },
    });

  await database.insert(chatMessages).values({
    sessionId,
    role: "user",
    message,
  });
};

const mapSources = (
  sources: PersistedAssistantAnswer["sources"],
): ChatSource[] =>
  sources.map((source) => ({
    chunkId: source.chunkId,
    article: source.articleNumber ?? undefined,
    paragraph: source.paragraphNumber ?? undefined,
    content: source.excerpt,
    similarity: source.score,
  }));

export const recordAssistantAnswer = async (
  sessionId: string,
  answer: PersistedAssistantAnswer,
) => {
  const database = getDatabase();

  await database.insert(chatMessages).values({
    sessionId,
    role: "assistant",
    message: answer.answer,
    status: answer.status,
    sources: mapSources(answer.sources),
    metadata: {
      provider: answer.provider,
      model: answer.model,
      latencyMs: answer.latencyMs,
    },
  });
};
