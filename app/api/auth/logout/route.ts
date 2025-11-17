import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { ensureCorrelationId, securityHeaders } from "@/lib/security";
import { trackEvent } from "@/lib/events";
import { getCurrentContext } from "@/lib/auth";

export const runtime = "nodejs";

function clearSessionCookie() {
  const secure = env.NODE_ENV !== "development";
  const parts = [
    `${env.AUTH_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function POST(req: Request) {
  const correlationId = ensureCorrelationId(req);
  const headers = new Headers({ "x-correlation-id": correlationId });
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
  headers.set("Set-Cookie", clearSessionCookie());

  try {
    const context = await getCurrentContext(req);
    if (context.userId && context.companyId) {
      await trackEvent({
        companyId: context.companyId,
        userId: context.userId,
        type: "auth.logout",
        source: "web",
        correlationId,
        payload: {},
      });
    }
  } catch (error) {
    console.warn("[auth] failed to log logout event", error);
  }

  return NextResponse.json({ ok: true, correlationId }, { headers });
}
