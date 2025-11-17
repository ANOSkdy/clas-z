import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { listRecords } from "@/lib/airtable";
import { getEventById, markNotified, recordNotification } from "@/lib/schedule";
import type { ApiError } from "@/lib/schemas/schedule";

export const runtime = "nodejs";

type CalendarRecordFields = {
  CompanyId: string;
  Title: string;
  StartsAt: string;
  EndsAt: string;
  Status?: "scheduled" | "done" | "cancelled";
  LastNotifiedAt?: string | null;
};

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
    if (!request.headers.get("x-vercel-cron")) {
      return respondError(correlationId, 401, "CRON_ONLY", "このエンドポイントは cron 専用です");
    }
    const now = new Date();
    const inMinutes = (minutes: number) => new Date(now.getTime() + minutes * 60 * 1000).toISOString();
    const from = inMinutes(60);
    const to = inMinutes(120);
    const filter = `AND({Status}='scheduled',IS_AFTER({StartsAt},'${from}'),IS_BEFORE({StartsAt},'${to}'),NOT({LastNotifiedAt}))`;
    const response = await listRecords<CalendarRecordFields>(
      "CalendarEvents",
      { filterByFormula: filter, pageSize: 50 },
      { maxRetries: 3 },
    );
    const notified: string[] = [];
    for (const record of response.records) {
      const event = await getEventById(record.id);
      await recordNotification(event.companyId, event, correlationId);
      await markNotified(event.id);
      notified.push(event.id);
    }
    return respond(correlationId, { notified, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "通知処理に失敗しました";
    return respondError(correlationId, 500, "NOTIFY_FAILED", message);
  }
}
