import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { registerVisit } from "@/server/analytics/analytics.service";
import { visitRequestSchema } from "@/server/analytics/analytics.validation";
import {
  apiRequestErrorResponse,
  assertTrustedJsonRequest,
  NO_STORE_API_HEADERS,
} from "@/server/http/api-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertTrustedJsonRequest(request);
    const body: unknown = await request.json();
    const input = visitRequestSchema.parse(body);
    const result = await registerVisit(input.sessionId);

    return NextResponse.json(
      {
        success: true,
        data: { session_id: result.sessionId },
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

    console.error("Visit registration failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      { success: false, message: "Unable to register visit." },
      { status: 500, headers: NO_STORE_API_HEADERS },
    );
  }
}
