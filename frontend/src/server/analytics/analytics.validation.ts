import { z } from "zod";

export const visitRequestSchema = z.object({
  sessionId: z.uuid("sessionId must be a valid UUID").optional(),
});
