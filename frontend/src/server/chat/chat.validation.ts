import { z } from "zod";

export const chatRequestSchema = z.object({
  sessionId: z.uuid("sessionId must be a valid UUID").optional(),
  message: z
    .string()
    .trim()
    .min(3, "message must contain at least 3 characters")
    .max(500, "message must not exceed 500 characters"),
});

export type ValidatedChatRequest = z.infer<typeof chatRequestSchema>;
