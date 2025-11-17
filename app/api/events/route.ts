import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentContext } from "@/lib/auth";
import { parseAnalyticsEvent, trackEvent } from "@/lib/events";
import { withServerTiming } from "@/lib/perf";
import { applyCORS, buildCSP, ensureCorrelationId, securityHeaders } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const correlationId = ensureCorrelationId(req);
  const baseHeaders = new Headers({ "x-correlation-id": correlationId });
  const { headers: corsHeaders } = applyCORS(req, req.headers.get("origin"));
  const csp = buildCSP({ reportOnly: true });
  baseHeaders.set(csp.headerName, csp.value);
  for (const [key, value] of Object.entries(securityHeaders)) {
    baseHeaders.set(key, value);
  }
  for (const [key, value] of corsHeaders.entries()) {
    baseHeaders.set(key, value);
  }

  const requestCorrelation = req.headers.get("x-correlation-id");
  let responseCorrelation = requestCorrelation ?? correlationId;
  try {
    const body = req.headers.get("content-length") ? await req.json() : {};
    const eventPayload = parseAnalyticsEvent(body);
    responseCorrelation = requestCorrelation ?? eventPayload.correlationId ?? responseCorrelation;
    baseHeaders.set("x-correlation-id", responseCorrelation);

    const context = await getCurrentContext(req);
    const companyId =
      context.companyId ?? (typeof eventPayload.payload?.companyId === "string" ? eventPayload.payload.companyId : null);
    if (!companyId) {
      return NextResponse.json(
        { error: { code: "COMPANY_REQUIRED", message: "companyId is required" }, correlationId: responseCorrelation },
        { status: 400, headers: baseHeaders },
      );
    }

    await withServerTiming(baseHeaders, "track", () =>
      trackEvent({
        companyId,
        userId: context.userId ?? undefined,
        type: eventPayload.type,
        source: eventPayload.source,
        correlationId: responseCorrelation,
        payload: eventPayload.payload,
      }),
    );

    return NextResponse.json({ ok: true, correlationId: responseCorrelation }, { headers: baseHeaders });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: error.issues[0]?.message ?? "Invalid payload" }, correlationId: responseCorrelation },
        { status: 400, headers: baseHeaders },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message }, correlationId: responseCorrelation },
      { status: 500, headers: baseHeaders },
    );
  }
}
