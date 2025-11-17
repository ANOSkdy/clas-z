import { NextResponse } from "next/server";

import { getCurrentContext } from "@/lib/auth";
import { ensureCorrelationId, securityHeaders } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const correlationId = ensureCorrelationId(req);
  const headers = new Headers({ "x-correlation-id": correlationId });
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }

  const context = await getCurrentContext(req);
  if (!context.userId || !context.companyId) {
    return NextResponse.json({ authenticated: false, correlationId }, { headers });
  }

  return NextResponse.json(
    {
      authenticated: true,
      userId: context.userId,
      companyId: context.companyId,
      roles: context.roles ?? undefined,
      correlationId,
    },
    { headers },
  );
}
