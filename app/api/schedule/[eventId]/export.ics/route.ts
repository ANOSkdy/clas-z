import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { findCompanyByToken, getEventById, toICS, trackScheduleAction } from "@/lib/schedule";
import { ICSExportQuerySchema, type ApiError } from "@/lib/schemas/schedule";

export const runtime = "nodejs";

function respondCalendar(body: string, correlationId: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "x-correlation-id": correlationId,
    },
  });
}

function respondError(correlationId: string, status: number, code: string, message: string) {
  const error: ApiError = { error: { code, message }, correlationId };
  return NextResponse.json(error, { status, headers: { "x-correlation-id": correlationId } });
}

export async function GET(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const correlationId = randomUUID();
  try {
    const parsed = ICSExportQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return respondError(correlationId, 400, "INVALID_QUERY", "token が必要です");
    }
    const company = await findCompanyByToken(parsed.data.token);
    if (!company) {
      return respondError(correlationId, 404, "COMPANY_NOT_FOUND", "有効なトークンではありません");
    }
    const { eventId } = await context.params;
    const event = await getEventById(eventId);
    if (event.companyId !== company.id) {
      return respondError(correlationId, 403, "FORBIDDEN", "イベントが見つかりません");
    }
    const feed = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//clas-z//schedule//event//JP",
      toICS(event),
      "END:VCALENDAR",
    ].join("\r\n");
    await trackScheduleAction(company.id, "schedule.ics.viewed", correlationId, { eventId: event.id });
    return respondCalendar(feed, correlationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "カレンダーの生成に失敗しました";
    return respondError(correlationId, 500, "ICS_EXPORT_FAILED", message);
  }
}
