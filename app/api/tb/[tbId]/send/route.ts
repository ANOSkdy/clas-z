import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { ApiError, SendRequestSchema } from "@/lib/schemas/tb";
import { TRIAL_BALANCES_TABLE, TrialBalanceRecordFields } from "@/lib/tb-store";
import { updateRecord } from "@/lib/airtable";

export const runtime = "nodejs";

function respond<T>(correlationId: string, data: T, init?: ResponseInit) {
  return NextResponse.json(
    { ...data, correlationId },
    { ...init, headers: { "x-correlation-id": correlationId, ...(init?.headers || {}) } },
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tbId: string }> }) {
  const correlationId = randomUUID();
  try {
    const body = await req.json();
    const input = SendRequestSchema.parse(body);

    const { tbId } = await params;

    // P4 stub: 実際の送信処理の代わりにログのみ
    console.info("TB send request", tbId, input.recipients);

    await updateRecord<TrialBalanceRecordFields>(TRIAL_BALANCES_TABLE, tbId, {
      Status: "sent",
      LastSentAt: new Date().toISOString(),
    });

    return respond(correlationId, { ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message ?? "入力が不正です";
      const payload: ApiError = { error: { code: "BAD_REQUEST", message }, correlationId };
      return respond(correlationId, payload, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    const payload: ApiError = { error: { code: "INTERNAL_ERROR", message }, correlationId };
    return respond(correlationId, payload, { status: 500 });
  }
}
