import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { ParseCsvRequestSchema, ApiError } from "@/lib/schemas/tb";
import { autoDetectDelimiter, parseCSV, rowsToTBLines } from "@/lib/csv";

const MAX_BYTES = 5 * 1024 * 1024;

export const runtime = "nodejs";

function toJsonResponse<T>(correlationId: string, data: T, init?: ResponseInit) {
  return NextResponse.json(
    { ...data, correlationId },
    {
      ...init,
      headers: {
        "x-correlation-id": correlationId,
        ...(init?.headers || {}),
      },
    },
  );
}

function handleError(correlationId: string, error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const payload: ApiError = {
    error: { code: status === 413 ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", message },
    correlationId,
  };
  return toJsonResponse(correlationId, payload, { status });
}

export async function POST(req: NextRequest) {
  const correlationId = randomUUID();

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let csvText = "";
    let header = true;
    let delimiter: "," | ";" | "\t" | undefined;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const parsed = ParseCsvRequestSchema.parse(body);
      csvText = parsed.csv;
      header = parsed.header ?? true;
      delimiter = parsed.delimiter;
    } else {
      csvText = await req.text();
    }

    const size = Buffer.byteLength(csvText, "utf-8");
    if (size > MAX_BYTES) {
      return handleError(correlationId, new Error("CSV が 5MB を超えています"), 413);
    }

    if (!delimiter) {
      delimiter = autoDetectDelimiter(csvText);
    }

    const rows = parseCSV(csvText, delimiter);
    const lines = rowsToTBLines(rows, header);
    if (lines.length > 5000) {
      throw new Error("5,000 行を超える CSV はサポートしていません");
    }

    const debitTotal = lines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = lines.reduce((sum, line) => sum + line.credit, 0);

    const stats = {
      count: lines.length,
      debitTotal,
      creditTotal,
      balanced: Math.abs(debitTotal - creditTotal) <= 0.5,
    };

    return toJsonResponse(correlationId, { lines, stats });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message ?? "入力が不正です";
      return handleError(correlationId, new Error(message), 400);
    }
    return handleError(correlationId, error);
  }
}
