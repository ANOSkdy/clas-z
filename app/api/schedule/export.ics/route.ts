import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { findCompanyByToken, listEvents, toICSFeed, trackScheduleAction } from "@/lib/schedule";
import { ICSExportQuerySchema, type ApiError } from "@/lib/schemas/schedule";

export const runtime = "nodejs";

function respondCalendar(body: string, correlationId: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=86400",
      "x-correlation-id": correlationId,
    },
  });
}

function respondError(correlationId: string, status: number, code: string, message: string) {
  const error: ApiError = { error: { code, message }, correlationId };
  return NextResponse.json(error, { status, headers: { "x-correlation-id": correlationId } });
}

export async function GET(request: NextRequest) {
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
    const nowIso = new Date().toISOString();
    const events = await listEvents(company.id, { from: nowIso, status: "scheduled", limit: 200 });
    const feed = toICSFeed(events.items, { companyName: company.name, timezone: parsed.data.tz ?? company.timezone });
    await trackScheduleAction(company.id, "schedule.ics.viewed", correlationId, { count: events.items.length });
    return respondCalendar(feed, correlationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "カレンダーの生成に失敗しました";
    return respondError(correlationId, 500, "ICS_EXPORT_FAILED", message);
  }
}
