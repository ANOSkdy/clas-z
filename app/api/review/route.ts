import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { listRecords } from "@/lib/airtable";
import { ReviewListQuerySchema } from "@/lib/schemas/review";
import {
  DOCUMENTS_TABLE,
  REVIEW_REQUESTED_FIELDS,
  SORT_FIELD_MAP,
  buildFilterFormula,
  mapRecordToListItem,
  type DocumentReviewFields,
} from "./utils";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const correlationId = randomUUID();
  try {
    const { searchParams } = new URL(req.url);
    const query = ReviewListQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      companyId: searchParams.get("companyId") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      order: searchParams.get("order") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    const filterByFormula = buildFilterFormula(query);
    const sortField = SORT_FIELD_MAP[query.sort] ?? SORT_FIELD_MAP.createdAt;

    const airtableResponse = await listRecords<DocumentReviewFields>(DOCUMENTS_TABLE, {
      filterByFormula,
      pageSize: query.limit,
      offset: query.cursor,
      sort: [{ field: sortField, direction: query.order }],
      fields: [...REVIEW_REQUESTED_FIELDS],
    });

    const items = airtableResponse.records.map(mapRecordToListItem);

    return NextResponse.json(
      {
        items,
        nextCursor: airtableResponse.offset,
      },
      { headers: { "x-correlation-id": correlationId } },
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: error.issues[0]?.message ?? "Invalid query",
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
