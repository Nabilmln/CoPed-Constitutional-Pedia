import { NextResponse } from "next/server";

const MAX_JSON_BODY_BYTES = 16 * 1024;

export const API_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export const NO_STORE_API_HEADERS = {
  ...API_SECURITY_HEADERS,
  "Cache-Control": "no-store",
};

export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly publicMessage: string;

  constructor(statusCode: number, publicMessage: string) {
    super(publicMessage);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
  }
}

const isSameOrigin = (request: Request, origin: string) => {
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
};

export const assertTrustedJsonRequest = (request: Request) => {
  const contentType = request.headers.get("content-type")?.toLowerCase();

  if (!contentType?.startsWith("application/json")) {
    throw new ApiRequestError(
      415,
      "Content-Type must be application/json.",
    );
  }

  const contentLength = Number(request.headers.get("content-length"));

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_JSON_BODY_BYTES
  ) {
    throw new ApiRequestError(413, "Request body is too large.");
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");

  if (
    fetchSite === "cross-site" ||
    (origin !== null && !isSameOrigin(request, origin))
  ) {
    throw new ApiRequestError(403, "Cross-origin request is not allowed.");
  }
};

export const apiRequestErrorResponse = (error: unknown) =>
  error instanceof ApiRequestError
    ? NextResponse.json(
        { success: false, message: error.publicMessage },
        {
          status: error.statusCode,
          headers: NO_STORE_API_HEADERS,
        },
      )
    : null;
