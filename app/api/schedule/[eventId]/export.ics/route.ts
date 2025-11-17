import { NextResponse } from "next/server";
import crypto from "crypto";
import { ICSExportQuerySchema } from "@/lib/schemas/schedule";
import { getEventById, toICS } from "@/lib/schedule";
import { trackEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { eventId: string } }) {
  const correlationId = crypto.randomUUID();
  try {
    const url = new URL(request.url);
    const parsed = ICSExportQuerySchema.parse({ token: url.searchParams.get("token") });
    const event = await getEventById(params.eventId);
    if (event.companyId !== parsed.token) {
      throw new Error("unauthorized");
    }
    const body = ["BEGIN:VCALENDAR", "VERSION:2.0", toICS(event), "END:VCALENDAR"].join("\r\n");
    void trackEvent({ type: "schedule.ics.viewed", payload: { eventId: params.eventId }, correlationId });
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "x-correlation-id": correlationId,
      },
    });
  } catch (error) {
    const res = NextResponse.json(
      { error: { code: "bad_request", message: (error as Error).message }, correlationId },
      { status: 400 },
    );
    res.headers.set("x-correlation-id", correlationId);
    return res;
  }
}
