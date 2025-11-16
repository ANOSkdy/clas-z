import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { updateRecord } from "@/lib/airtable";
import { SendRequestSchema } from "@/lib/schemas/tb";
import { TB_TABLE, TrialBalanceRecordFields } from "../../helpers";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { tbId: string } }) {
  const correlationId = randomUUID();
  try {
    const body = await req.json();
    const parsed = SendRequestSchema.parse(body);

    await updateRecord<TrialBalanceRecordFields>(TB_TABLE, params.tbId, {
      Status: "sent",
      LastSentAt: new Date().toISOString(),
    });

    console.info("TB send stub", { tbId: params.tbId, recipients: parsed.recipients, message: parsed.message });

    return NextResponse.json(
      { ok: true, correlationId },
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
