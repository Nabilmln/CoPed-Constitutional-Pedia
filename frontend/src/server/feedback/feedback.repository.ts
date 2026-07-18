import { and, count, desc, eq, gt } from "drizzle-orm";

import { getDatabase } from "@/server/database/client";
import { feedback } from "@/server/database/schema";

import type { ValidatedFeedbackRequest } from "./feedback.validation";

export const countRecentFeedback = async (
  sessionId: string,
  since: Date,
) => {
  const database = getDatabase();
  const [result] = await database
    .select({ value: count() })
    .from(feedback)
    .where(
      and(
        eq(feedback.sessionId, sessionId),
        gt(feedback.createdAt, since),
      ),
    );

  return result?.value ?? 0;
};

export const createFeedback = async (
  sessionId: string,
  input: ValidatedFeedbackRequest,
) => {
  const database = getDatabase();
  const [created] = await database
    .insert(feedback)
    .values({
      sessionId,
      name: input.name,
      email: input.email,
      message: input.message,
    })
    .returning({
      id: feedback.id,
      status: feedback.status,
      createdAt: feedback.createdAt,
    });

  return created;
};

export const getReviewedTestimonials = async (limit = 18) => {
  const database = getDatabase();

  return database
    .select({
      name: feedback.name,
      message: feedback.message,
      createdAt: feedback.createdAt,
    })
    .from(feedback)
    .where(eq(feedback.status, "reviewed"))
    .orderBy(desc(feedback.createdAt))
    .limit(limit);
};
