import { NextResponse } from "next/server";

import { readPublicStats } from "@/server/analytics/analytics.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await readPublicStats();

    return NextResponse.json(
      {
        success: true,
        data: {
          total_visitors: stats.totalVisitors,
          total_questions: stats.totalQuestions,
          total_feedback: stats.totalFeedback,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Public stats request failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      { success: false, message: "Unable to load public statistics." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
