import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { getRecord, listRecords } from "@/lib/airtable";
import { trackEvent } from "@/lib/events";
import {
  computeCompanyRating,
  computeDocumentRating,
  persistCompanyRatingToAirtable,
  persistDocumentRatingToAirtable,
} from "@/lib/rating";
import type { DocumentRecordFields } from "@/lib/schemas";
import { ComputeRequest } from "@/lib/schemas/rating";
import type { CompanyRating } from "@/lib/schemas/rating";

export const runtime = "nodejs";

const DOCUMENTS_TABLE = "Documents";

type DocumentRecord = {
  id: string;
  createdTime: string;
  fields: DocumentRecordFields & { Meta?: Record<string, unknown> };
};

type ComputeOptions = {
  dryRun?: boolean;
  correlationId: string;
  reason?: string;
};

function toMeta(record: DocumentRecord) {
  const meta = (record.fields.Meta ?? {}) as Record<string, unknown>;
  const fileName = typeof meta.name === "string" ? meta.name : typeof meta.fileName === "string" ? meta.fileName : undefined;
  const mimeType = typeof meta.type === "string" ? meta.type : typeof meta.mimeType === "string" ? meta.mimeType : undefined;
  const size = typeof meta.size === "number" ? meta.size : undefined;
  return { fileName, mimeType, size };
}

function buildDocumentRating(record: DocumentRecord) {
  if (!record.fields.CompanyId) {
    throw new Error(`Document ${record.id} missing CompanyId`);
  }
  return computeDocumentRating({
    doc: {
      id: record.id,
      companyId: record.fields.CompanyId,
      status: record.fields.Status ?? "pending",
      createdAt: record.fields.UploadedAt ?? record.createdTime,
      updatedAt: record.fields.UpdatedAt ?? record.createdTime,
      aiLabel: record.fields.LatestAiLabel,
    },
    classifyConfidence: record.fields.LatestAiConfidence,
    meta: toMeta(record),
    timings: {
      uploadedAt: record.fields.UploadedAt ?? record.createdTime,
      classifiedAt: record.fields.ClassifiedAt ?? record.fields.UpdatedAt ?? record.createdTime,
    },
  });
}

async function rateDocument(record: DocumentRecord, options: ComputeOptions) {
  const rating = buildDocumentRating(record);
  if (!options.dryRun) {
    await persistDocumentRatingToAirtable(rating);
    await trackEvent({
      companyId: rating.companyId,
      type: "rating.computed",
      source: "/api/rating/compute",
      correlationId: options.correlationId,
      payload: {
        scope: "document",
        documentId: rating.documentId,
        score: rating.score,
        level: rating.level,
        reason: options.reason,
      },
    });
  }
  return rating;
}

async function rateCompany(companyId: string, options: ComputeOptions) {
  const records: DocumentRecord[] = [];
  let offset: string | undefined;
  do {
    const page = await listRecords<DocumentRecordFields>(DOCUMENTS_TABLE, {
      filterByFormula: `{CompanyId}='${companyId}'`,
      pageSize: 50,
      offset,
    });
    records.push(
      ...page.records.map((record) => ({
        id: record.id,
        createdTime: record.createdTime,
        fields: record.fields,
      })),
    );
    offset = page.offset;
  } while (offset);
  const docRatings = await Promise.all(records.map((record) => rateDocument(record, options)));
  const companyRating = computeCompanyRating({ companyId, docs: docRatings });
  if (!options.dryRun) {
    await persistCompanyRatingToAirtable(companyRating);
    await trackEvent({
      companyId,
      type: "rating.computed",
      source: "/api/rating/compute",
      correlationId: options.correlationId,
      payload: {
        scope: "company",
        companyId,
        score: companyRating.score,
        level: companyRating.level,
        reason: options.reason,
      },
    });
  }
  return { companyRating, docRatings };
}

export async function POST(req: Request) {
  const requestCorrelation = req.headers.get("x-correlation-id");
  const correlationId = requestCorrelation ?? randomUUID();
  try {
    const body = req.headers.get("content-length") ? await req.json() : {};
    const input = ComputeRequest.parse(body);
    const options: ComputeOptions = { dryRun: input.dryRun, correlationId, reason: input.reason };
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    if (input.scope === "document") {
      if (!input.documentId) {
        return NextResponse.json(
          { error: { code: "DOCUMENT_REQUIRED", message: "documentId is required" }, correlationId },
          { status: 400, headers: { "x-correlation-id": correlationId } },
        );
      }
      const record = await getRecord<DocumentRecordFields>(DOCUMENTS_TABLE, input.documentId);
      const rating = await rateDocument(
        {
          id: record.id,
          createdTime: record.createdTime,
          fields: record.fields,
        },
        options,
      );
      return NextResponse.json({ scope: "document", rating, correlationId }, { headers: { "x-correlation-id": correlationId } });
    }

    if (input.scope === "company") {
      if (!input.companyId) {
        return NextResponse.json(
          { error: { code: "COMPANY_REQUIRED", message: "companyId is required" }, correlationId },
          { status: 400, headers: { "x-correlation-id": correlationId } },
        );
      }
      const { companyRating, docRatings } = await rateCompany(input.companyId, options);
      return NextResponse.json(
        { scope: "company", company: companyRating, documents: docRatings, correlationId },
        { headers: { "x-correlation-id": correlationId } },
      );
    }

    if (input.companyId) {
      const { companyRating } = await rateCompany(input.companyId, options);
      return NextResponse.json(
        { scope: "all", companies: [companyRating], nextCursor: null, correlationId },
        { headers: { "x-correlation-id": correlationId } },
      );
    }

    const companyRatings: CompanyRating[] = [];
    const seenCompanies = new Set<string>();
    const page = await listRecords<DocumentRecordFields>(DOCUMENTS_TABLE, {
      fields: ["CompanyId"],
      pageSize: 50,
      offset: cursor,
      sort: [{ field: "CompanyId", direction: "asc" }],
    });
    for (const record of page.records) {
      if (!record.fields.CompanyId) continue;
      if (seenCompanies.has(record.fields.CompanyId)) continue;
      seenCompanies.add(record.fields.CompanyId);
      const { companyRating } = await rateCompany(record.fields.CompanyId, options);
      companyRatings.push(companyRating);
    }

    return NextResponse.json(
      { scope: "all", companies: companyRatings, nextCursor: page.offset ?? null, correlationId },
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
