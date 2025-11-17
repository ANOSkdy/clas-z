import { NextResponse } from "next/server";
import crypto from "crypto";
import { ICSExportQuerySchema } from "@/lib/schemas/schedule";
import { listEvents, toICSFeed } from "@/lib/schedule";
import { trackEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const url = new URL(request.url);
    const parsed = ICSExportQuerySchema.parse({ token: url.searchParams.get("token"), tz: url.searchParams.get("tz") || undefined });
    const events = await listEvents(parsed.token, { status: "scheduled" });
    const body = toICSFeed(events.items, { companyName: parsed.token });
    void trackEvent({ type: "schedule.ics.viewed", payload: { token: parsed.token }, correlationId });
    const res = new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
        "x-correlation-id": correlationId,
      },
    });
    return res;
  } catch (error) {
    const res = NextResponse.json(
      { error: { code: "bad_request", message: (error as Error).message }, correlationId },
      { status: 400 },
    );
    res.headers.set("x-correlation-id", correlationId);
    return res;
  }
}
