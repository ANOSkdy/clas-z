import { NextResponse } from "next/server";
import crypto from "crypto";
import { SuggestScheduleRequestSchema } from "@/lib/schemas/schedule";
import { suggestSchedule } from "@/lib/ai";
import { trackEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const body = await request.json();
    const parsed = SuggestScheduleRequestSchema.parse(body);
    const companyId = (body.companyId as string) || "default";
    const proposals = await suggestSchedule({ companyId, ...parsed });
    void trackEvent({ type: "schedule.suggested", payload: { companyId }, correlationId });
    const res = NextResponse.json({ proposals, correlationId });
    res.headers.set("x-correlation-id", correlationId);
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
