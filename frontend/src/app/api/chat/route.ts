import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  ChatProcessingError,
  ChatRateLimitError,
} from "@/server/chat/chat.errors";
import { processChatMessage } from "@/server/chat/chat.service";
import { chatRequestSchema } from "@/server/chat/chat.validation";
import {
  apiRequestErrorResponse,
  assertTrustedJsonRequest,
  NO_STORE_API_HEADERS,
} from "@/server/http/api-security";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertTrustedJsonRequest(request);
    const body: unknown = await request.json();
    const input = chatRequestSchema.parse(body);
    const result = await processChatMessage({
      sessionId: input.sessionId,
      message: input.message,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          session_id: result.sessionId,
          answer: result.answer,
          status: result.status,
          sources: result.sources,
          provider: result.provider,
          model: result.model,
        },
      },
      { headers: NO_STORE_API_HEADERS },
    );
  } catch (error) {
    const securityResponse = apiRequestErrorResponse(error);

    if (securityResponse) {
      return securityResponse;
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400, headers: NO_STORE_API_HEADERS },
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
        { status: 400, headers: NO_STORE_API_HEADERS },
      );
    }

    if (error instanceof ChatRateLimitError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Terlalu banyak pertanyaan. Silakan tunggu sebelum mencoba lagi.",
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_API_HEADERS,
            "Retry-After": String(error.retryAfterSeconds),
          },
        },
      );
    }

    if (error instanceof ChatProcessingError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Maaf, layanan chatbot sedang mengalami kendala. Silakan coba lagi.",
          session_id: error.sessionId,
        },
        { status: 503, headers: NO_STORE_API_HEADERS },
      );
    }

    console.error("Unhandled chat API error.", {
      reason: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error.",
      },
      { status: 500, headers: NO_STORE_API_HEADERS },
    );
  }
}
