import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { ApiError, UpsertLinesRequestSchema } from "@/lib/schemas/tb";
import { replaceTrialBalanceLines } from "@/lib/tb-store";

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
    const input = UpsertLinesRequestSchema.parse(body);

    if (input.lines.length > 5000) {
      throw new Error("5,000 行を超える仕訳は保存できません");
    }

    const { tbId } = await params;
    const totals = await replaceTrialBalanceLines(tbId, input.lines);

    return respond(correlationId, { ok: true, totals });
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
