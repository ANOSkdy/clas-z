import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { getCurrentContext } from "@/lib/auth";
import { trackEvent } from "@/lib/events";
import { Events } from "@/lib/schemas/rating";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const requestCorrelation = req.headers.get("x-correlation-id");
  const correlationId = requestCorrelation ?? randomUUID();
  try {
    const body = req.headers.get("content-length") ? await req.json() : {};
    const eventPayload = Events.parse(body);
    const context = await getCurrentContext(req);
    const companyId =
      context.companyId ?? (typeof eventPayload.payload?.companyId === "string" ? eventPayload.payload.companyId : null);
    if (!companyId) {
      return NextResponse.json(
        { error: { code: "COMPANY_REQUIRED", message: "companyId is required" }, correlationId },
        { status: 400, headers: { "x-correlation-id": correlationId } },
      );
    }

    await trackEvent({
      companyId,
      userId: context.userId ?? undefined,
      type: eventPayload.type,
      source: eventPayload.source,
      correlationId,
      payload: eventPayload.payload,
    });

    return NextResponse.json({ ok: true, correlationId }, { headers: { "x-correlation-id": correlationId } });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: error.issues[0]?.message ?? "Invalid payload" }, correlationId },
        { status: 400, headers: { "x-correlation-id": correlationId } },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message }, correlationId },
      { status: 500, headers: { "x-correlation-id": correlationId } },
    );
  }
}
