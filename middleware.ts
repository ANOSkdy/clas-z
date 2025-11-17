import { NextResponse, type NextRequest } from "next/server";

import { applyCORS, buildCSP, securityHeaders } from "./lib/security";
import { checkRate, getRetryAfter } from "./lib/rate-limit";

const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const correlationId = request.headers.get("x-correlation-id") ?? crypto.randomUUID();
  const { allow, headers: corsHeaders } = applyCORS(request);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: allow ? 204 : 403,
      headers: {
        ...corsHeaders,
        "x-correlation-id": correlationId,
      },
    });
  }

  if (!allow && request.headers.get("origin")) {
    return NextResponse.json(
      { error: { code: "CORS_REJECTED", message: "Origin not allowed" }, correlationId },
      { status: 403, headers: { ...corsHeaders, ...securityHeaders, ...headerWithCSP(), "x-correlation-id": correlationId } },
    );
  }

  const limiterKey = `${request.ip ?? "0.0.0.0"}:${request.nextUrl.pathname}`;
  const rate = checkRate({ key: limiterKey, limit: RATE_LIMIT, windowMs: WINDOW_MS });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: { code: "RATE_LIMITED", message: "Too Many Requests" },
        correlationId,
      },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Retry-After": getRetryAfter(rate.reset).toString(),
          "X-RateLimit-Limit": RATE_LIMIT.toString(),
          "X-RateLimit-Remaining": rate.remaining.toString(),
          "X-RateLimit-Reset": rate.reset.toString(),
          "x-correlation-id": correlationId,
          ...securityHeaders,
          ...headerWithCSP(),
        },
      },
    );
  }

  const response = NextResponse.next({ request });
  const extraHeaders = {
    ...corsHeaders,
    "X-RateLimit-Limit": RATE_LIMIT.toString(),
    "X-RateLimit-Remaining": rate.remaining.toString(),
    "X-RateLimit-Reset": rate.reset.toString(),
    "x-correlation-id": correlationId,
    ...securityHeaders,
    ...headerWithCSP(),
  } satisfies Record<string, string>;
  Object.entries(extraHeaders).forEach(([key, value]) => {
    if (!value) return;
    response.headers.set(key, value);
  });
  return response;
}

function headerWithCSP() {
  const csp = buildCSP();
  return { [csp.header]: csp.value } as Record<string, string>;
}

export const config = {
  matcher: "/api/:path*",
};
