import { NextResponse } from "next/server";

import { readPublicTestimonials } from "@/server/feedback/feedback.service";
import {
  API_SECURITY_HEADERS,
  NO_STORE_API_HEADERS,
} from "@/server/http/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const testimonials = await readPublicTestimonials();

    return NextResponse.json(
      {
        success: true,
        data: {
          testimonials: testimonials.map((testimonial) => ({
            name: testimonial.name,
            message: testimonial.message,
            created_at: testimonial.createdAt.toISOString(),
          })),
        },
      },
      {
        headers: {
          ...API_SECURITY_HEADERS,
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("Public testimonials request failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      { success: false, message: "Unable to load testimonials." },
      { status: 500, headers: NO_STORE_API_HEADERS },
    );
  }
}
