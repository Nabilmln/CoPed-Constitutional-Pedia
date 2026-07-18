import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { registerVisit } from "@/server/analytics/analytics.service";
import { visitRequestSchema } from "@/server/analytics/analytics.validation";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = visitRequestSchema.parse(body);
    const result = await registerVisit(input.sessionId);

    return NextResponse.json(
      {
        success: true,
        data: { session_id: result.sessionId },
      },
      { headers: noStoreHeaders },
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

    console.error("Visit registration failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      { success: false, message: "Unable to register visit." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
