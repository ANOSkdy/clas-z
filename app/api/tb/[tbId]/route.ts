import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { ApiError } from "@/lib/schemas/tb";
import {
  getTrialBalanceRecord,
  mapTrialBalanceRecord,
  listTrialBalanceLines,
  summarizeLines,
} from "@/lib/tb-store";

export const runtime = "nodejs";

function respond<T>(correlationId: string, data: T, init?: ResponseInit) {
  return NextResponse.json(
    { ...data, correlationId },
    { ...init, headers: { "x-correlation-id": correlationId, ...(init?.headers || {}) } },
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tbId: string }> }) {
  const correlationId = randomUUID();
  try {
    const { tbId } = await params;
    const record = await getTrialBalanceRecord(tbId);
    const header = mapTrialBalanceRecord(record);
    const lines = await listTrialBalanceLines(tbId);
    const totalsFromLines = summarizeLines(lines);
    const totals = {
      debitTotal: record.fields.DebitTotal ?? totalsFromLines.debitTotal,
      creditTotal: record.fields.CreditTotal ?? totalsFromLines.creditTotal,
      count: record.fields.LineCount ?? totalsFromLines.count,
      balanced:
        typeof record.fields.DebitTotal === "number" && typeof record.fields.CreditTotal === "number"
          ? Math.abs((record.fields.DebitTotal ?? 0) - (record.fields.CreditTotal ?? 0)) <= 0.5
          : totalsFromLines.balanced,
    };

    return respond(correlationId, { header, totals, lines });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const payload: ApiError = { error: { code: "NOT_FOUND", message }, correlationId };
    return respond(correlationId, payload, { status: 404 });
  }
}
