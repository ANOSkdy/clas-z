import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { CreateTBRequestSchema } from "@/lib/schemas/tb";
import { createRecord, listRecords } from "@/lib/airtable";
import { getCurrentContext } from "@/lib/auth";
import { mapHeader, TB_TABLE, TrialBalanceRecordFields } from "./helpers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const correlationId = randomUUID();
  try {
    const body = await req.json();
    const parsed = CreateTBRequestSchema.parse(body);
    const auth = await getCurrentContext(req);
    const companyId = parsed.companyId ?? auth.companyId;
    if (!companyId) {
      throw new Error("companyId を特定できません");
    }
    const record = await createRecord<TrialBalanceRecordFields>(TB_TABLE, {
      CompanyId: companyId,
      PeriodStart: parsed.periodStart,
      PeriodEnd: parsed.periodEnd,
      Currency: parsed.currency ?? "JPY",
      Status: "draft",
      Source: parsed.source,
      Meta: parsed.meta,
    });
    return NextResponse.json(
      { tbId: record.id, correlationId },
      { status: 200, headers: { "x-correlation-id": correlationId } },
    );
  } catch (error: unknown) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid payload"
      : error instanceof Error
        ? error.message
        : "Unknown error";
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: { code: status === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR", message }, correlationId },
      { status, headers: { "x-correlation-id": correlationId } },
    );
  }
}

export async function GET(req: Request) {
  const correlationId = randomUUID();
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const auth = await getCurrentContext(req);
    const companyId = url.searchParams.get("companyId") ?? auth.companyId ?? undefined;
    const filterByFormula = companyId ? `({CompanyId} = '${companyId}')` : undefined;
    const result = await listRecords<TrialBalanceRecordFields>(TB_TABLE, {
      pageSize: limit,
      offset: cursor,
      filterByFormula,
      sort: [{ field: "createdTime", direction: "desc" }],
    });
    const items = result.records.map((record) => ({
      ...mapHeader(record),
      debitTotal: record.fields.DebitTotal ?? 0,
      creditTotal: record.fields.CreditTotal ?? 0,
      lineCount: record.fields.LineCount ?? 0,
      lastSentAt: record.fields.LastSentAt,
    }));
    return NextResponse.json(
      { items, nextCursor: result.offset, correlationId },
      { status: 200, headers: { "x-correlation-id": correlationId } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message }, correlationId },
      { status: 500, headers: { "x-correlation-id": correlationId } },
    );
  }
}
