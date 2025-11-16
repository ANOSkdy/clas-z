import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { ExtractPdfRequestSchema } from "@/lib/schemas/tb";
import { extractTrialBalance } from "@/lib/ai";
import { computeStats, ensureLineLimit } from "@/lib/tb";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function POST(req: Request) {
  const correlationId = randomUUID();
  try {
    const json = await req.json();
    const parsed = ExtractPdfRequestSchema.parse(json);
    const hintedSize = Number(req.headers.get("x-blob-size"));
    if (Number.isFinite(hintedSize) && hintedSize > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: { code: "PAYLOAD_TOO_LARGE", message: "PDF は 50MB 以内でアップロードしてください" }, correlationId },
        { status: 413, headers: { "x-correlation-id": correlationId } },
      );
    }
    const { lines, confidence } = await extractTrialBalance(parsed);
    ensureLineLimit(lines);
    const stats = computeStats(lines);
    return NextResponse.json(
      { lines, stats, confidence, correlationId },
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
