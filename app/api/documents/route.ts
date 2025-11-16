import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createRecord } from "@/lib/airtable";
import { DocumentCreateSchema, type DocumentRecordFields } from "@/lib/schemas";
import { getCurrentContext } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const correlationId = randomUUID();
  try {
    const body = await req.json();
    const input = DocumentCreateSchema.parse(body);
    await getCurrentContext(req); // placeholder for invitationトークン連携

    const fields: DocumentRecordFields = {
      CompanyId: input.companyId,
      UploaderUserId: input.uploaderUserId,
      BlobUrl: input.blobUrl,
      Meta: input.meta,
      Status: "pending",
    };

    const record = await createRecord<DocumentRecordFields>("Documents", fields);

    return NextResponse.json(
      {
        documentId: record.id,
        correlationId,
      },
      { status: 201 },
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
