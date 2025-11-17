import { NextResponse } from "next/server";
import crypto from "crypto";
import { UpdateEventRequestSchema } from "@/lib/schemas/schedule";
import { getEventById, updateEvent, softDeleteEvent } from "@/lib/schedule";

export const runtime = "node";

export async function GET(_request: Request, { params }: { params: { eventId: string } }) {
  const correlationId = crypto.randomUUID();
  try {
    const event = await getEventById(params.eventId);
    const res = NextResponse.json({ event, correlationId });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    const res = NextResponse.json(
      { error: { code: "not_found", message: (error as Error).message }, correlationId },
      { status: 404 },
    );
    res.headers.set("x-correlation-id", correlationId);
    return res;
  }
}

export async function PUT(request: Request, { params }: { params: { eventId: string } }) {
  const correlationId = crypto.randomUUID();
  try {
    const json = await request.json();
    const parsed = UpdateEventRequestSchema.parse(json);
    const updated = await updateEvent(params.eventId, {
      Title: parsed.title,
      Description: parsed.description,
      StartsAt: parsed.startsAt,
      EndsAt: parsed.endsAt,
      Timezone: parsed.timezone,
      Location: parsed.location,
      Attendees: parsed.attendees,
      Status: parsed.status,
    });
    const res = NextResponse.json({ event: updated, correlationId });
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

export async function DELETE(_request: Request, { params }: { params: { eventId: string } }) {
  const correlationId = crypto.randomUUID();
  try {
    const updated = await softDeleteEvent(params.eventId);
    const res = NextResponse.json({ event: updated, correlationId });
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
