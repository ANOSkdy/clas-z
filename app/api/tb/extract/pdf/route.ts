import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { ExtractPdfRequestSchema, ApiError } from "@/lib/schemas/tb";
import { extractTrialBalance } from "@/lib/ai";
import { summarizeLines } from "@/lib/tb-store";

export const runtime = "nodejs";

function jsonWithCorrelation<T>(correlationId: string, data: T, init?: ResponseInit) {
  return NextResponse.json(
    { ...data, correlationId },
    {
      ...init,
      headers: { "x-correlation-id": correlationId, ...(init?.headers || {}) },
    },
  );
}

export async function POST(req: Request) {
  const correlationId = randomUUID();
  try {
    const body = await req.json();
    const input = ExtractPdfRequestSchema.parse(body);
    const result = await extractTrialBalance(input);
    const stats = summarizeLines(result.lines);
    return jsonWithCorrelation(correlationId, { lines: result.lines, stats, confidence: result.confidence });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message ?? "入力が不正です";
      return jsonWithCorrelation<ApiError>(
        correlationId,
        {
          error: { code: "BAD_REQUEST", message },
          correlationId,
        },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonWithCorrelation<ApiError>(
      correlationId,
      { error: { code: "INTERNAL_ERROR", message }, correlationId },
      { status: 500 },
    );
  }
}
