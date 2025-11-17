import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getCurrentContext } from "@/lib/auth";
import {
  createEvent,
  listEvents,
  trackScheduleAction,
} from "@/lib/schedule";
import {
  CreateEventRequestSchema,
  ListEventsQuerySchema,
  type ApiError,
} from "@/lib/schemas/schedule";

export const runtime = "node";

function respond<T>(correlationId: string, body: T, status = 200) {
  return NextResponse.json(body, { status, headers: { "x-correlation-id": correlationId } });
}

function respondError(correlationId: string, status: number, code: string, message: string) {
  const error: ApiError = { error: { code, message }, correlationId };
  return respond(error.correlationId, error, status);
}

export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  try {
    const auth = await getCurrentContext(request);
    if (!auth.companyId) {
      return respondError(correlationId, 401, "AUTH_REQUIRED", "companyId が必要です");
    }
    const parsed = ListEventsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return respondError(
        correlationId,
        400,
        "INVALID_QUERY",
        parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      );
    }
    const result = await listEvents(auth.companyId, parsed.data);
    return respond(correlationId, { ...result, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "イベント一覧の取得に失敗しました";
    return respondError(correlationId, 500, "SCHEDULE_LIST_FAILED", message);
  }
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();
  try {
    const auth = await getCurrentContext(request);
    if (!auth.companyId) {
      return respondError(correlationId, 401, "AUTH_REQUIRED", "companyId が必要です");
    }
    const body = await request.json().catch(() => null);
    const parsed = CreateEventRequestSchema.safeParse(body);
    if (!parsed.success) {
      return respondError(
        correlationId,
        400,
        "INVALID_BODY",
        parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      );
    }
    const created = await createEvent(auth.companyId, {
      ...parsed.data,
      status: "scheduled",
      source: "manual",
    });
    await trackScheduleAction(auth.companyId, "schedule.created", correlationId, { eventId: created.id });
    return respond(correlationId, { eventId: created.id, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "イベントの作成に失敗しました";
    return respondError(correlationId, 500, "SCHEDULE_CREATE_FAILED", message);
  }
}
