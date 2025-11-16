import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { ParseCsvRequestSchema } from "@/lib/schemas/tb";
import { autoDetectDelimiter, parseCSV, rowsToTBLines } from "@/lib/csv";
import { computeStats, ensureLineLimit } from "@/lib/tb";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const correlationId = randomUUID();
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let csv = "";
    let delimiter: string | undefined;
    let header = true;
    if (contentType.includes("text/csv")) {
      csv = await req.text();
    } else {
      const json = await req.json();
      const parsed = ParseCsvRequestSchema.parse(json);
      csv = parsed.csv;
      delimiter = parsed.delimiter;
      header = typeof parsed.header === "boolean" ? parsed.header : true;
    }

    if (!csv) {
      return NextResponse.json(
        {
          error: { code: "BAD_REQUEST", message: "CSV 本文が空です" },
          correlationId,
        },
        { status: 400, headers: { "x-correlation-id": correlationId } },
      );
    }
    if (Buffer.byteLength(csv, "utf-8") > MAX_SIZE) {
      return NextResponse.json(
        {
          error: { code: "PAYLOAD_TOO_LARGE", message: "CSV が大きすぎます (5MB 以内)" },
          correlationId,
        },
        { status: 413, headers: { "x-correlation-id": correlationId } },
      );
    }

    const delim = (delimiter as "," | ";" | "\t" | undefined) ?? autoDetectDelimiter(csv);
    const rows = parseCSV(csv, delim);
    const lines = rowsToTBLines(rows, header);
    ensureLineLimit(lines);
    const stats = computeStats(lines);

    return NextResponse.json(
      { lines, stats, correlationId },
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
      {
        error: { code: "BAD_REQUEST", message },
        correlationId,
      },
      { status, headers: { "x-correlation-id": correlationId } },
    );
  }
}
