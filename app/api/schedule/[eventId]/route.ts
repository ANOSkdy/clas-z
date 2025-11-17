import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getCurrentContext } from "@/lib/auth";
import { getEventById, softDeleteEvent, trackScheduleAction, updateEvent } from "@/lib/schedule";
import { UpdateEventRequestSchema, type ApiError } from "@/lib/schemas/schedule";

export const runtime = "node";

function respond<T>(correlationId: string, body: T, status = 200) {
  return NextResponse.json(body, { status, headers: { "x-correlation-id": correlationId } });
}

function respondError(correlationId: string, status: number, code: string, message: string) {
  const error: ApiError = { error: { code, message }, correlationId };
  return respond(error.correlationId, error, status);
}

export async function GET(_request: NextRequest, { params }: { params: { eventId: string } }) {
  const correlationId = randomUUID();
  try {
    const event = await getEventById(params.eventId);
    return respond(correlationId, { event, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "イベントの取得に失敗しました";
    return respondError(correlationId, 404, "NOT_FOUND", message);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { eventId: string } }) {
  const correlationId = randomUUID();
  try {
    const auth = await getCurrentContext(request);
    if (!auth.companyId) {
      return respondError(correlationId, 401, "AUTH_REQUIRED", "companyId が必要です");
    }
    const body = await request.json().catch(() => null);
    const parsed = UpdateEventRequestSchema.safeParse(body);
    if (!parsed.success) {
      return respondError(
        correlationId,
        400,
        "INVALID_BODY",
        parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      );
    }
    const existing = await getEventById(params.eventId);
    if (existing.companyId !== auth.companyId) {
      return respondError(correlationId, 403, "FORBIDDEN", "権限がありません");
    }
    const updated = await updateEvent(params.eventId, parsed.data);
    await trackScheduleAction(auth.companyId, "schedule.updated", correlationId, { eventId: updated.id });
    return respond(correlationId, { event: updated, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "イベントの更新に失敗しました";
    return respondError(correlationId, 500, "SCHEDULE_UPDATE_FAILED", message);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { eventId: string } }) {
  const correlationId = randomUUID();
  try {
    const auth = await getCurrentContext(request);
    if (!auth.companyId) {
      return respondError(correlationId, 401, "AUTH_REQUIRED", "companyId が必要です");
    }
    const existing = await getEventById(params.eventId);
    if (existing.companyId !== auth.companyId) {
      return respondError(correlationId, 403, "FORBIDDEN", "権限がありません");
    }
    const deleted = await softDeleteEvent(params.eventId);
    await trackScheduleAction(auth.companyId, "schedule.cancelled", correlationId, { eventId: deleted.id });
    return respond(correlationId, { event: deleted, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "イベントの削除に失敗しました";
    return respondError(correlationId, 500, "SCHEDULE_DELETE_FAILED", message);
  }
}
