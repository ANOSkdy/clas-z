import { z } from "zod";
import {
  ReviewDetailSchema,
  ReviewListItemSchema,
  ReviewListQuerySchema,
  type ReviewDetail,
  type ReviewListItem,
} from "@/lib/schemas/review";

export const DOCUMENTS_TABLE = "Documents";
export const REVIEW_REQUESTED_FIELDS = [
  "FileName",
  "BlobUrl",
  "MimeType",
  "Size",
  "Status",
  "AiLabel",
  "AiConfidence",
  "CompanyId",
  "CompanyName",
  "UploaderUserId",
  "CreatedAt",
  "UpdatedAt",
  "RejectReason",
  "Note",
] as const;

export type DocumentReviewFields = {
  FileName?: string;
  BlobUrl?: string;
  MimeType?: string;
  Size?: number | string;
  Status?: string;
  AiLabel?: string;
  AiConfidence?: number | string;
  CompanyId?: string;
  CompanyName?: string;
  UploaderUserId?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  RejectReason?: string;
  Note?: string;
};

export const SORT_FIELD_MAP: Record<string, string> = {
  createdAt: "CreatedAt",
  aiLabel: "AiLabel",
  status: "Status",
};

function normalizeSize(value: DocumentReviewFields["Size"]): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeConfidence(value: DocumentReviewFields["AiConfidence"]): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function buildFilterFormula(query: z.infer<typeof ReviewListQuerySchema>): string | undefined {
  const filters: string[] = [];
  if (query.status && query.status !== "all") {
    filters.push(`{Status}='${escapeFormulaValue(query.status)}'`);
  }
  if (query.companyId) {
    filters.push(`{CompanyId}='${escapeFormulaValue(query.companyId)}'`);
  }
  if (query.q) {
    const normalized = escapeFormulaValue(query.q.toLowerCase());
    filters.push(
      `FIND(LOWER('${normalized}'), LOWER({FileName}&' '&{AiLabel}&' '&{CompanyName}))>0`,
    );
  }
  if (!filters.length) return undefined;
  if (filters.length === 1) return filters[0];
  return `AND(${filters.join(",")})`;
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function mapRecordToListItem(record: {
  id: string;
  createdTime: string;
  fields: DocumentReviewFields;
}): ReviewListItem {
  const parsed = ReviewListItemSchema.safeParse({
    id: record.id,
    fileName: record.fields.FileName ?? "不明なファイル",
    blobUrl: record.fields.BlobUrl,
    mimeType: record.fields.MimeType,
    size: normalizeSize(record.fields.Size),
    status: record.fields.Status ?? "pending",
    aiLabel: record.fields.AiLabel,
    aiConfidence: normalizeConfidence(record.fields.AiConfidence),
    companyId: record.fields.CompanyId,
    companyName: record.fields.CompanyName,
    uploaderUserId: record.fields.UploaderUserId,
    createdAt: record.fields.CreatedAt ?? record.createdTime,
    updatedAt: record.fields.UpdatedAt ?? null,
    rejectReason: record.fields.RejectReason ?? null,
  });

  if (!parsed.success) {
    throw new Error(
      `Failed to normalize record ${record.id}: ${parsed.error.issues[0]?.message ?? "unknown"}`,
    );
  }

  return parsed.data;
}

export function mapRecordToDetail(record: {
  id: string;
  createdTime: string;
  fields: DocumentReviewFields;
}): ReviewDetail {
  const parsed = ReviewDetailSchema.safeParse({
    ...mapRecordToListItem(record),
    note: record.fields.Note ?? null,
  });

  if (!parsed.success) {
    throw new Error(
      `Failed to normalize detail ${record.id}: ${parsed.error.issues[0]?.message ?? "unknown"}`,
    );
  }

  return parsed.data;
}
