import { count, eq } from "drizzle-orm";

import { getDatabase } from "@/server/database/client";
import {
  chatMessages,
  feedback,
  visitorSessions,
} from "@/server/database/schema";

export const upsertVisitorSession = async (
  sessionId: string,
  seenAt = new Date(),
) => {
  const database = getDatabase();

  await database
    .insert(visitorSessions)
    .values({
      sessionId,
      questionCount: 0,
      firstSeenAt: seenAt,
      lastSeenAt: seenAt,
    })
    .onConflictDoUpdate({
      target: visitorSessions.sessionId,
      set: { lastSeenAt: seenAt },
    });
};

export const getPublicStats = async () => {
  const database = getDatabase();
  const [visitorResult, questionResult, feedbackResult] = await Promise.all([
    database.select({ value: count() }).from(visitorSessions),
    database
      .select({ value: count() })
      .from(chatMessages)
      .where(eq(chatMessages.role, "user")),
    database.select({ value: count() }).from(feedback),
  ]);

  return {
    totalVisitors: visitorResult[0]?.value ?? 0,
    totalQuestions: questionResult[0]?.value ?? 0,
    totalFeedback: feedbackResult[0]?.value ?? 0,
  };
};
