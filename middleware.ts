import { NextResponse, type NextRequest } from "next/server";

import { checkRate } from "@/lib/rate-limit";
import { applyCORS, buildCSP, ensureCorrelationId, securityHeaders } from "@/lib/security";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };

export const config = {
  matcher: "/api/:path*",
};

export function middleware(req: NextRequest) {
  const correlationId = ensureCorrelationId(req);
  const { allow, headers: corsHeaders } = applyCORS(req, req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    const preflight = NextResponse.json({}, { status: allow ? 200 : 403, headers: { "x-correlation-id": correlationId } });
    for (const [key, value] of corsHeaders.entries()) {
      preflight.headers.set(key, value);
    }
    return preflight;
  }

  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateKey = `${ip}:${req.nextUrl.pathname}`;
  const rate = checkRate({ key: rateKey, ...RATE_LIMIT });

  if (!rate.allowed) {
    const limited = NextResponse.json(
      {
        error: { code: "RATE_LIMITED", message: "Too Many Requests" },
        correlationId,
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rate.reset - Date.now()) / 1000).toString(),
          "x-correlation-id": correlationId,
          "X-RateLimit-Limit": RATE_LIMIT.limit.toString(),
          "X-RateLimit-Remaining": rate.remaining.toString(),
          "X-RateLimit-Reset": rate.reset.toString(),
        },
      },
    );
    for (const [key, value] of corsHeaders.entries()) {
      limited.headers.set(key, value);
    }
    return limited;
  }

  const res = NextResponse.next();
  const csp = buildCSP({ reportOnly: true });
  res.headers.set(csp.headerName, csp.value);
  res.headers.set("x-correlation-id", correlationId);
  res.headers.set("X-RateLimit-Limit", RATE_LIMIT.limit.toString());
  res.headers.set("X-RateLimit-Remaining", rate.remaining.toString());
  res.headers.set("X-RateLimit-Reset", rate.reset.toString());

  for (const [key, value] of corsHeaders.entries()) {
    res.headers.set(key, value);
  }
  for (const [key, value] of Object.entries(securityHeaders)) {
    res.headers.set(key, value);
  }

  return res;
}
