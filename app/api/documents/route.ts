import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { createRecord } from "@/lib/airtable";
import { getCurrentContext } from "@/lib/auth";
import { trackEvent } from "@/lib/events";
import { requestRatingRecompute } from "@/lib/rating";
import { DocumentCreateSchema, type DocumentRecordFields } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const requestCorrelation = req.headers.get("x-correlation-id");
  const correlationId = requestCorrelation ?? randomUUID();
  try {
    const body = await req.json();
    const input = DocumentCreateSchema.parse(body);
    const context = await getCurrentContext(req);

    const fields: DocumentRecordFields = {
      CompanyId: input.companyId,
      UploaderUserId: input.uploaderUserId,
      BlobUrl: input.blobUrl,
      Meta: input.meta,
      Status: "pending",
    };

    const record = await createRecord<DocumentRecordFields>("Documents", fields);

    await trackEvent({
      companyId: input.companyId,
      userId: context.userId ?? input.uploaderUserId,
      type: "document.created",
      source: "/api/documents",
      correlationId,
      payload: { documentId: record.id, uploaderUserId: input.uploaderUserId },
    });

    requestRatingRecompute({ scope: "document", documentId: record.id, reason: "document.created" }, correlationId);

    return NextResponse.json(
      {
        documentId: record.id,
        correlationId,
      },
      { status: 201, headers: { "x-correlation-id": correlationId } },
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: error.issues[0]?.message ?? "Invalid payload",
          },
          correlationId,
        },
        { status: 400, headers: { "x-correlation-id": correlationId } },
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
      { status: 500, headers: { "x-correlation-id": correlationId } },
    );
  }
}
