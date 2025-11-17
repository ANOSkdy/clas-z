import { NextResponse } from "next/server";
import crypto from "crypto";
import { listEvents, updateEvent } from "@/lib/schedule";
import { trackEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  if (!request.headers.get("x-vercel-cron")) {
    return NextResponse.json({ error: { code: "forbidden", message: "cron only" }, correlationId }, { status: 403 });
  }
  const now = Date.now();
  const soon = new Date(now + 90 * 60 * 1000).toISOString();
  const windowStart = new Date(now + 60 * 60 * 1000).toISOString();
  const events = await listEvents("default", { from: windowStart, to: soon, status: "scheduled" });
  await Promise.all(
    events.items.map(async (event) => {
      if (event.lastNotifiedAt) return;
      void trackEvent({ type: "schedule.notify.sent", payload: { eventId: event.id }, correlationId });
      await updateEvent(event.id, { LastNotifiedAt: new Date().toISOString() });
    }),
  );
  const res = NextResponse.json({ ok: true, correlationId });
  res.headers.set("x-correlation-id", correlationId);
  return res;
}
