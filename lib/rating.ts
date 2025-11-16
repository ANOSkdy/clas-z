import "server-only";

import { listRecords, createRecord, updateRecord } from "./airtable";
import { env } from "./env";
import type { DocumentRecordFields } from "./schemas";
import type {
  CompanyRating,
  DocumentRating,
  RatingBreakdown,
  RatingLevel,
  ComputeRequest,
} from "./schemas/rating";

type RatingRecordFields = {
  Scope: "document" | "company";
  CompanyId: string;
  DocumentId?: string;
  Score: number;
  Level: RatingLevel;
  BreakdownJson?: string;
  ComputedAt: string;
};

const RATINGS_TABLE = "Ratings";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function grade(score: number): RatingLevel {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  return "D";
}

type ComputeDocumentInput = {
  doc: {
    id: string;
    companyId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    aiLabel?: string | null;
  };
  classifyConfidence?: number;
  meta: {
    fileName?: string;
    mimeType?: string;
    size?: number;
  };
  timings?: {
    uploadedAt?: string;
    classifiedAt?: string;
  };
};

export function computeDocumentRating(input: ComputeDocumentInput): DocumentRating {
  const confidenceScore = clamp((input.classifyConfidence ?? 0) * 50, 0, 50);
  const statusBonus = input.doc.status === "confirmed" ? 20 : input.doc.status === "pending" ? 5 : 0;
  const metaFields = [input.meta.fileName, input.meta.mimeType, input.meta.size];
  const metaCompleteness = (metaFields.filter((value) => Boolean(value)).length / metaFields.length) * 20;
  let speedBonus = 0;
  if (input.timings?.uploadedAt && input.timings?.classifiedAt) {
    const diffMs = Math.max(0, new Date(input.timings.classifiedAt).getTime() - new Date(input.timings.uploadedAt).getTime());
    const diffSeconds = diffMs / 1000;
    if (diffSeconds <= 60) {
      speedBonus = clamp(((60 - diffSeconds) / 60) * 10, 0, 10);
    }
  }

  const score = clamp(confidenceScore + statusBonus + metaCompleteness + speedBonus, 0, 100);
  const breakdown: RatingBreakdown = {
    confidence: Number(confidenceScore.toFixed(2)),
    statusBonus: Number(statusBonus.toFixed(2)),
    metaCompleteness: Number(metaCompleteness.toFixed(2)),
    speedBonus: Number(speedBonus.toFixed(2)),
  };

  return {
    documentId: input.doc.id,
    companyId: input.doc.companyId,
    score: Number(score.toFixed(2)),
    level: grade(score),
    breakdown,
    computedAt: new Date().toISOString(),
  };
}

export function computeCompanyRating(input: { companyId: string; docs: DocumentRating[] }): CompanyRating {
  const score = input.docs.length
    ? input.docs.reduce((total, doc) => total + doc.score, 0) / input.docs.length
    : 0;
  return {
    companyId: input.companyId,
    score: Number(score.toFixed(2)),
    level: grade(score),
    computedAt: new Date().toISOString(),
    docs: input.docs,
  };
}

async function findRatingRecordId(filter: string) {
  const response = await listRecords<RatingRecordFields>(RATINGS_TABLE, {
    filterByFormula: filter,
    maxRecords: 1,
  });
  const record = response.records[0];
  return record?.id ?? null;
}

export async function persistDocumentRatingToAirtable(rating: DocumentRating) {
  const fields: RatingRecordFields = {
    Scope: "document",
    CompanyId: rating.companyId,
    DocumentId: rating.documentId,
    Score: rating.score,
    Level: rating.level,
    BreakdownJson: JSON.stringify(rating.breakdown),
    ComputedAt: rating.computedAt,
  };
  const filter = `AND({Scope}='document',{DocumentId}='${rating.documentId}')`;
  const existingId = await findRatingRecordId(filter);
  if (existingId) {
    await updateRecord<RatingRecordFields>(RATINGS_TABLE, existingId, fields);
  } else {
    await createRecord<RatingRecordFields>(RATINGS_TABLE, fields);
  }
}

export async function persistCompanyRatingToAirtable(rating: CompanyRating) {
  const fields: RatingRecordFields = {
    Scope: "company",
    CompanyId: rating.companyId,
    Score: rating.score,
    Level: rating.level,
    ComputedAt: rating.computedAt,
  };
  const filter = `AND({Scope}='company',{CompanyId}='${rating.companyId}')`;
  const existingId = await findRatingRecordId(filter);
  if (existingId) {
    await updateRecord<RatingRecordFields>(RATINGS_TABLE, existingId, fields);
  } else {
    await createRecord<RatingRecordFields>(RATINGS_TABLE, fields);
  }
}

export type AirtableDocumentRecord = {
  id: string;
  fields: DocumentRecordFields & {
    CreatedAt?: string;
  };
  createdTime: string;
};

export function requestRatingRecompute(body: ComputeRequest, correlationId: string) {
  const endpoint = `${env.APP_BASE_URL.replace(/\/$/, "")}/api/rating/compute`;
  void fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": correlationId,
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch((error) => {
    console.warn("[rating] failed to enqueue compute", error);
  });
}
