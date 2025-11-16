import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { listRecords } from "@/lib/airtable";
import { mapRecordToDetail, REVIEW_REQUESTED_FIELDS, DOCUMENTS_TABLE, type DocumentReviewFields } from "../utils";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  documentId: z.string().min(1, "documentId is required"),
});

export async function GET(req: Request) {
  const correlationId = randomUUID();
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const fromPath = segments.at(-1);
    const { documentId } = ParamsSchema.parse({ documentId: fromPath ?? "" });

    const result = await listRecords<DocumentReviewFields>(DOCUMENTS_TABLE, {
      filterByFormula: `RECORD_ID()='${documentId}'`,
      maxRecords: 1,
      fields: [...REVIEW_REQUESTED_FIELDS],
    });

    const record = result.records[0];
    if (!record) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Document not found",
          },
          correlationId,
        },
        { status: 404 },
      );
    }

    const detail = mapRecordToDetail(record);

    return NextResponse.json(detail, { headers: { "x-correlation-id": correlationId } });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: error.issues[0]?.message ?? "Invalid request",
          },
          correlationId,
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message,
        },
        correlationId,
      },
      { status: 500 },
    );
  }
}
