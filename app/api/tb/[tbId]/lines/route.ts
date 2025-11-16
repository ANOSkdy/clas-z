import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  createRecordsBatch,
  deleteRecords,
  getRecord,
  listRecords,
  updateRecord,
} from "@/lib/airtable";
import { UpsertLinesRequestSchema } from "@/lib/schemas/tb";
import { computeStats, ensureLineLimit, toMinorUnits } from "@/lib/tb";
import {
  mapHeader,
  TB_LINE_TABLE,
  TB_TABLE,
  TrialBalanceLineRecordFields,
  TrialBalanceRecordFields,
} from "../../helpers";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { tbId: string } }) {
  const correlationId = randomUUID();
  try {
    const body = await req.json();
    const parsed = UpsertLinesRequestSchema.parse(body);
    ensureLineLimit(parsed.lines);
    const stats = computeStats(parsed.lines);
    const headerRecord = await getRecord<TrialBalanceRecordFields>(TB_TABLE, params.tbId);
    const currency = headerRecord.fields.Currency ?? "JPY";

    const toDelete: string[] = [];
    let offset: string | undefined;
    do {
      const page = await listRecords<TrialBalanceLineRecordFields>(TB_LINE_TABLE, {
        filterByFormula: `({TrialBalanceId} = '${params.tbId}')`,
        fields: ["TrialBalanceId"],
        pageSize: 100,
        offset,
      });
      toDelete.push(...page.records.map((record) => record.id));
      offset = page.offset;
    } while (offset);
    if (toDelete.length) {
      await deleteRecords(TB_LINE_TABLE, toDelete);
    }

    await createRecordsBatch<TrialBalanceLineRecordFields>(
      TB_LINE_TABLE,
      parsed.lines.map((line) => ({
        TrialBalanceId: params.tbId,
        AccountCode: line.accountCode,
        AccountName: line.accountName,
        Debit: line.debit,
        Credit: line.credit,
        Note: line.note,
        MinorDebit: toMinorUnits(line.debit, currency),
        MinorCredit: toMinorUnits(line.credit, currency),
      })),
    );

    const nextHeaderFields: TrialBalanceRecordFields = {
      ...headerRecord.fields,
      Status: stats.balanced ? "ready" : "error",
      DebitTotal: stats.debitTotal,
      CreditTotal: stats.creditTotal,
      LineCount: parsed.lines.length,
    };

    await updateRecord<TrialBalanceRecordFields>(TB_TABLE, params.tbId, {
      Status: stats.balanced ? "ready" : "error",
      DebitTotal: stats.debitTotal,
      CreditTotal: stats.creditTotal,
      LineCount: parsed.lines.length,
    });

    return NextResponse.json(
      {
        ok: true,
        totals: stats,
        header: mapHeader({ id: headerRecord.id, fields: nextHeaderFields }),
        correlationId,
      },
      { status: 200, headers: { "x-correlation-id": correlationId } },
    );
  } catch (error: unknown) {
    const status = error instanceof z.ZodError ? 400 : 500;
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid payload"
      : error instanceof Error
        ? error.message
        : "Unknown error";
    return NextResponse.json(
      { error: { code: status === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR", message }, correlationId },
      { status, headers: { "x-correlation-id": correlationId } },
    );
  }
}
