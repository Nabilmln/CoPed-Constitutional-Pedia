import { z } from "zod";

export const feedbackRequestSchema = z.object({
  sessionId: z.uuid("sessionId must be a valid UUID").optional(),
  name: z
    .string()
    .trim()
    .min(2, "name must contain at least 2 characters")
    .max(80, "name must not exceed 80 characters")
    .optional(),
  email: z
    .email("email must be valid")
    .max(254, "email must not exceed 254 characters")
    .optional(),
  message: z
    .string()
    .trim()
    .min(5, "message must contain at least 5 characters")
    .max(1_000, "message must not exceed 1000 characters"),
});

export type ValidatedFeedbackRequest = z.infer<
  typeof feedbackRequestSchema
>;
