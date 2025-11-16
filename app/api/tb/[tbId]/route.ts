import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getRecord } from "@/lib/airtable";
import { mapHeader, TB_TABLE, TrialBalanceRecordFields } from "../helpers";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { tbId: string } }) {
  const correlationId = randomUUID();
  try {
    const record = await getRecord<TrialBalanceRecordFields>(TB_TABLE, params.tbId);
    const header = mapHeader(record);
    return NextResponse.json(
      {
        ...header,
        debitTotal: record.fields.DebitTotal ?? 0,
        creditTotal: record.fields.CreditTotal ?? 0,
        lineCount: record.fields.LineCount ?? 0,
        lastSentAt: record.fields.LastSentAt,
        correlationId,
      },
      { status: 200, headers: { "x-correlation-id": correlationId } },
    );
  } catch (error: unknown) {
    const isNotFound = error instanceof Error && /404/.test(error.message);
    const status = isNotFound ? 404 : 500;
    const message = error instanceof Error ? error.message : "Not found";
    return NextResponse.json(
      { error: { code: isNotFound ? "NOT_FOUND" : "INTERNAL_ERROR", message }, correlationId },
      { status, headers: { "x-correlation-id": correlationId } },
    );
  }
}
