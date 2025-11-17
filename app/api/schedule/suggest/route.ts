import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getCurrentContext } from "@/lib/auth";
import { suggestSchedule } from "@/lib/ai";
import { trackScheduleAction } from "@/lib/schedule";
import { SuggestScheduleRequestSchema, type ApiError } from "@/lib/schemas/schedule";

export const runtime = "nodejs";

function respond<T>(correlationId: string, body: T, status = 200) {
  return NextResponse.json(body, { status, headers: { "x-correlation-id": correlationId } });
}

function respondError(correlationId: string, status: number, code: string, message: string) {
  const error: ApiError = { error: { code, message }, correlationId };
  return respond(error.correlationId, error, status);
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();
  try {
    const auth = await getCurrentContext(request);
    if (!auth.companyId) {
      return respondError(correlationId, 401, "AUTH_REQUIRED", "companyId が必要です");
    }
    const body = await request.json().catch(() => null);
    const parsed = SuggestScheduleRequestSchema.safeParse(body);
    if (!parsed.success) {
      return respondError(
        correlationId,
        400,
        "INVALID_BODY",
        parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      );
    }
    const proposals = await suggestSchedule({ companyId: auth.companyId, ...parsed.data });
    await trackScheduleAction(auth.companyId, "schedule.suggested", correlationId, { proposals: proposals.length });
    return respond(correlationId, { proposals, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "スケジュール提案に失敗しました";
    return respondError(correlationId, 500, "SCHEDULE_SUGGEST_FAILED", message);
  }
}
