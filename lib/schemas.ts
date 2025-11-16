import { z } from "zod";

export const UserRoles = ["owner", "admin", "reviewer", "uploader"] as const;
export type UserRole = (typeof UserRoles)[number];

export const DocumentStatusValues = [
  "pending",
  "uploading",
  "classified",
  "needs_review",
  "confirmed",
  "rejected",
] as const;
export type DocumentStatus = (typeof DocumentStatusValues)[number];

export const TaskStatusValues = ["open", "in_progress", "done", "snoozed"] as const;
export type TaskStatus = (typeof TaskStatusValues)[number];

export const DocumentCreateSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  uploaderUserId: z.string().min(1, "uploaderUserId is required"),
  blobUrl: z.string().url("blobUrl must be URL"),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type DocumentCreateInput = z.infer<typeof DocumentCreateSchema>;

export const ClassifyRequestSchema = z.object({
  documentId: z.string().min(1),
  blobUrl: z.string().url(),
  language: z.string().min(2).max(8).optional(),
});
export type ClassifyRequestInput = z.infer<typeof ClassifyRequestSchema>;

export const ClassifyResponseSchema = z.object({
  aiLabel: z.string().min(1),
  confidence: z.number().min(0).max(1),
  ocrText: z.string().optional(),
});
export type ClassifyResponse = z.infer<typeof ClassifyResponseSchema>;

export const ReviewDecisionSchema = z.object({
  reason: z.string().min(1, "理由は必須です"),
});
export type ReviewDecisionInput = z.infer<typeof ReviewDecisionSchema>;

export type DocumentRecordFields = {
  CompanyId: string;
  UploaderUserId: string;
  BlobUrl: string;
  Meta?: Record<string, unknown>;
  Status: DocumentStatus;
  LatestAiLabel?: string;
};
