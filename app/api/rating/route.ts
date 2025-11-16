import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { listRecords } from "@/lib/airtable";
import { getCurrentContext } from "@/lib/auth";
import { trackEvent } from "@/lib/events";
import type { DocumentRecordFields } from "@/lib/schemas";
import type { CompanyRating, DocumentRating, RatingBreakdown } from "@/lib/schemas/rating";

export const runtime = "nodejs";

const RATINGS_TABLE = "Ratings";
const DOCUMENTS_TABLE = "Documents";
const EVENTS_TABLE = "AnalyticsEvents";

type RatingRecordFields = {
  Scope: "document" | "company";
  CompanyId: string;
  DocumentId?: string;
  Score: number;
  Level: string;
  BreakdownJson?: string;
  ComputedAt?: string;
};

type AnalyticsEventFields = {
  CompanyId: string;
  UserId?: string | null;
  Type: string;
  Source: string;
  CorrelationId?: string;
  PayloadJson?: string;
};

function parseBreakdown(json?: string): RatingBreakdown {
  if (!json) {
    return { confidence: 0, statusBonus: 0, metaCompleteness: 0, speedBonus: 0 };
  }
  try {
    const parsed = JSON.parse(json);
    return {
      confidence: Number(parsed.confidence ?? 0),
      statusBonus: Number(parsed.statusBonus ?? 0),
      metaCompleteness: Number(parsed.metaCompleteness ?? 0),
      speedBonus: Number(parsed.speedBonus ?? 0),
    };
  } catch {
    return { confidence: 0, statusBonus: 0, metaCompleteness: 0, speedBonus: 0 };
  }
}

async function fetchDocumentSummaries(documentIds: string[]) {
  const summaries = new Map<
    string,
    { fileName?: string; status?: string; aiLabel?: string; updatedAt?: string }
  >();
  const chunkSize = 10;
  for (let i = 0; i < documentIds.length; i += chunkSize) {
    const chunk = documentIds.slice(i, i + chunkSize);
    if (!chunk.length) continue;
    const clauses = chunk.map((id) => `RECORD_ID()='${id}'`).join(",");
    const formula = chunk.length === 1 ? clauses : `OR(${clauses})`;
    const response = await listRecords<DocumentRecordFields>(DOCUMENTS_TABLE, {
      filterByFormula: formula,
      pageSize: chunk.length,
    });
    for (const record of response.records) {
      const meta = (record.fields.Meta ?? {}) as Record<string, unknown>;
      const fileName = typeof meta.name === "string" ? meta.name : typeof meta.fileName === "string" ? meta.fileName : undefined;
      summaries.set(record.id, {
        fileName,
        status: record.fields.Status,
        aiLabel: record.fields.LatestAiLabel,
        updatedAt: record.fields.UpdatedAt ?? record.createdTime,
      });
    }
  }
  return summaries;
}

export async function GET(req: Request) {
  const requestCorrelation = req.headers.get("x-correlation-id");
  const correlationId = requestCorrelation ?? randomUUID();
  try {
    const url = new URL(req.url);
    const context = await getCurrentContext(req);
    const companyId = url.searchParams.get("company") ?? context.companyId;
    if (!companyId) {
      return NextResponse.json(
        { error: { code: "COMPANY_REQUIRED", message: "company query or context is required" }, correlationId },
        { status: 400, headers: { "x-correlation-id": correlationId } },
      );
    }

    const companyRatingResponse = await listRecords<RatingRecordFields>(RATINGS_TABLE, {
      filterByFormula: `AND({Scope}='company',{CompanyId}='${companyId}')`,
      maxRecords: 1,
    });
    const companyRecord = companyRatingResponse.records[0];
    const companyRating: CompanyRating | null = companyRecord
      ? {
          companyId,
          score: companyRecord.fields.Score,
          level: companyRecord.fields.Level as CompanyRating["level"],
          computedAt: companyRecord.fields.ComputedAt ?? companyRecord.createdTime,
        }
      : null;

    const documentRatingsResponse = await listRecords<RatingRecordFields>(RATINGS_TABLE, {
      filterByFormula: `AND({Scope}='document',{CompanyId}='${companyId}')`,
      pageSize: 100,
      sort: [{ field: "ComputedAt", direction: "desc" }],
    });
    const docs = documentRatingsResponse.records.slice(0, 100);
    const docRatings: DocumentRating[] = docs.map((record) => ({
      documentId: record.fields.DocumentId ?? record.id,
      companyId,
      score: record.fields.Score,
      level: record.fields.Level as DocumentRating["level"],
      breakdown: parseBreakdown(record.fields.BreakdownJson),
      computedAt: record.fields.ComputedAt ?? record.createdTime,
    }));

    const summaries = await fetchDocumentSummaries(docRatings.map((doc) => doc.documentId));
    const decoratedDocs = docRatings.map((doc) => ({
      ...doc,
      fileName: summaries.get(doc.documentId)?.fileName,
      status: summaries.get(doc.documentId)?.status,
      aiLabel: summaries.get(doc.documentId)?.aiLabel,
      updatedAt: summaries.get(doc.documentId)?.updatedAt ?? doc.computedAt,
    }));

    const eventsResponse = await listRecords<AnalyticsEventFields>(EVENTS_TABLE, {
      filterByFormula: `{CompanyId}='${companyId}'`,
      pageSize: 50,
    });
    const events = eventsResponse.records
      .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime())
      .slice(0, 50)
      .map((record) => ({
        id: record.id,
        type: record.fields.Type,
        source: record.fields.Source,
        createdAt: record.createdTime,
        correlationId: record.fields.CorrelationId,
        payload: record.fields.PayloadJson ? JSON.parse(record.fields.PayloadJson) : undefined,
      }));

    await trackEvent({
      companyId,
      userId: context.userId ?? undefined,
      type: "rating.viewed",
      source: "/api/rating",
      correlationId,
      payload: { companyId },
    });

    return NextResponse.json(
      { companyId, company: companyRating, documents: decoratedDocs, events, correlationId },
      { headers: { "x-correlation-id": correlationId } },
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: error.issues[0]?.message ?? "Invalid payload" }, correlationId },
        { status: 400, headers: { "x-correlation-id": correlationId } },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message }, correlationId },
      { status: 500, headers: { "x-correlation-id": correlationId } },
    );
  }
}
