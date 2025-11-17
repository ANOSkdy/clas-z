import { NextResponse } from "next/server";
import crypto from "crypto";
import { ListEventsQuerySchema, CreateEventRequestSchema } from "@/lib/schemas/schedule";
import { createEvent, listEvents } from "@/lib/schedule";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const url = new URL(request.url);
    const parsed = ListEventsQuerySchema.parse({
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      status: url.searchParams.get("status") || undefined,
      limit: url.searchParams.get("limit") || undefined,
      cursor: url.searchParams.get("cursor") || undefined,
    });
    const companyId = url.searchParams.get("companyId") || "default";
    const result = await listEvents(companyId, parsed);
    const res = NextResponse.json({ ...result, correlationId });
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

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const json = await request.json();
    const parsed = CreateEventRequestSchema.parse(json);
    const companyId = (json.companyId as string) || "default";
    const created = await createEvent(companyId, {
      ...parsed,
    });
    const res = NextResponse.json({ eventId: created.id, correlationId });
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
