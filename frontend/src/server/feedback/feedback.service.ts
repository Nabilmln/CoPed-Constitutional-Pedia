import { randomUUID } from "node:crypto";

import { upsertVisitorSession } from "@/server/analytics/analytics.repository";
import { getFeedbackEnv } from "@/server/config/env";

import { FeedbackRateLimitError } from "./feedback.errors";
import {
  countRecentFeedback,
  createFeedback,
  getReviewedTestimonials,
} from "./feedback.repository";
import type { ValidatedFeedbackRequest } from "./feedback.validation";

type FeedbackDependencies = {
  createSessionId?: () => string;
  countRecent?: (sessionId: string, since: Date) => Promise<number>;
  saveVisitor?: (sessionId: string, seenAt?: Date) => Promise<void>;
  saveFeedback?: typeof createFeedback;
  now?: () => Date;
  rateLimitMax?: number;
  rateLimitWindowSeconds?: number;
};

export const submitFeedback = async (
  input: ValidatedFeedbackRequest,
  dependencies: FeedbackDependencies = {},
) => {
  const config = getFeedbackEnv();
  const sessionId =
    input.sessionId ??
    dependencies.createSessionId?.() ??
    randomUUID();
  const now = dependencies.now?.() ?? new Date();
  const windowSeconds =
    dependencies.rateLimitWindowSeconds ??
    config.FEEDBACK_RATE_LIMIT_WINDOW_SECONDS;
  const maxSubmissions =
    dependencies.rateLimitMax ?? config.FEEDBACK_RATE_LIMIT_MAX;
  const countRecent = dependencies.countRecent ?? countRecentFeedback;
  const recentCount = await countRecent(
    sessionId,
    new Date(now.getTime() - windowSeconds * 1_000),
  );

  if (recentCount >= maxSubmissions) {
    throw new FeedbackRateLimitError(windowSeconds);
  }

  const saveVisitor = dependencies.saveVisitor ?? upsertVisitorSession;
  const saveFeedback = dependencies.saveFeedback ?? createFeedback;

  await saveVisitor(sessionId, now);
  const created = await saveFeedback(sessionId, input);

  return {
    sessionId,
    feedbackId: created.id,
    status: created.status,
    createdAt: created.createdAt,
  };
};

type TestimonialDependencies = {
  readTestimonials?: typeof getReviewedTestimonials;
};

export const readPublicTestimonials = async (
  dependencies: TestimonialDependencies = {},
) => {
  const readTestimonials =
    dependencies.readTestimonials ?? getReviewedTestimonials;
  const testimonials = await readTestimonials();

  return testimonials.map((testimonial) => ({
    name: testimonial.name?.trim() || "Pengguna CoPed",
    message: testimonial.message,
    createdAt: testimonial.createdAt,
  }));
};
