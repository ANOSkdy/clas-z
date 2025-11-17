import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { getCurrentContext } from "@/lib/auth";
import { parseAnalyticsEvent, trackEvent } from "@/lib/events";
import { formatServerTiming, withServerTiming } from "@/lib/perf";
import { applyCORS, buildCSP, securityHeaders } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const requestCorrelation = req.headers.get("x-correlation-id");
  let correlationId = requestCorrelation ?? randomUUID();
  const { headers: corsHeaders } = applyCORS(req);
  const csp = buildCSP();
  const baseHeaders: Record<string, string> = {
    ...corsHeaders,
    ...securityHeaders,
    [csp.header]: csp.value,
    "x-correlation-id": correlationId,
  };
  try {
    const body = req.headers.get("content-length") ? await req.json() : {};
    const eventPayload = parseAnalyticsEvent(body);
    correlationId = requestCorrelation ?? eventPayload.correlationId ?? correlationId;
    baseHeaders["x-correlation-id"] = correlationId;
    const context = await getCurrentContext(req);
    let companyId =
      context.companyId ?? (typeof eventPayload.payload?.companyId === "string" ? eventPayload.payload.companyId : null);
    if (!companyId && eventPayload.type === "perf.vitals") {
      companyId = "anonymous";
    }
    if (!companyId) {
      return NextResponse.json(
        { error: { code: "COMPANY_REQUIRED", message: "companyId is required" }, correlationId },
        { status: 400, headers: baseHeaders },
      );
    }

    const timings = [] as ReturnType<typeof withServerTiming>[];
    const tracker = withServerTiming("track", () =>
      trackEvent({
        companyId,
        userId: context.userId ?? undefined,
        type: eventPayload.type,
        source: eventPayload.source,
        correlationId,
        payload: eventPayload.payload,
      }),
    );
    timings.push(tracker);
    await tracker.result;

    const headers = { ...baseHeaders };
    const serverTiming = formatServerTiming(timings.map((timing) => timing.metric));
    if (serverTiming) headers["Server-Timing"] = serverTiming;

    return NextResponse.json({ ok: true, correlationId }, { headers });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: error.issues[0]?.message ?? "Invalid payload" }, correlationId },
        { status: 400, headers: baseHeaders },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message }, correlationId },
      { status: 500, headers: baseHeaders },
    );
  }
}
