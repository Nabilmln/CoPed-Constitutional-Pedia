import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { FeedbackRateLimitError } from "@/server/feedback/feedback.errors";
import { submitFeedback } from "@/server/feedback/feedback.service";
import { feedbackRequestSchema } from "@/server/feedback/feedback.validation";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = feedbackRequestSchema.parse(body);
    const result = await submitFeedback(input);

    return NextResponse.json(
      {
        success: true,
        data: {
          session_id: result.sessionId,
          feedback_id: result.feedbackId,
          status: result.status,
          created_at: result.createdAt.toISOString(),
        },
      },
      { status: 201, headers: noStoreHeaders },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400, headers: noStoreHeaders },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400, headers: noStoreHeaders },
      );
    }

    if (error instanceof FeedbackRateLimitError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Batas pengiriman kritik dan saran telah tercapai. Silakan coba lagi nanti.",
        },
        {
          status: 429,
          headers: {
            ...noStoreHeaders,
            "Retry-After": String(error.retryAfterSeconds),
          },
        },
      );
    }

    console.error("Feedback submission failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Kritik dan saran belum dapat dikirim. Silakan coba lagi.",
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
