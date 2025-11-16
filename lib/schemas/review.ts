import { z } from "zod";

export const ReviewStatusValues = ["pending", "confirmed", "rejected"] as const;
export const ReviewStatusSchema = z.enum(ReviewStatusValues);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const ReviewListSortValues = ["createdAt", "aiLabel", "status"] as const;
export type ReviewListSort = (typeof ReviewListSortValues)[number];

export const ReviewListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120, "検索キーワードは 120 文字以内にしてください")
    .optional(),
  status: z.enum(["all", ...ReviewStatusValues]).default("pending"),
  companyId: z.string().trim().optional(),
  sort: z.enum(ReviewListSortValues).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type ReviewListQuery = z.infer<typeof ReviewListQuerySchema>;

export const ReviewListItemSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  blobUrl: z.string().url().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  size: z.number().int().nonnegative().optional().nullable(),
  status: ReviewStatusSchema,
  aiLabel: z.string().optional().nullable(),
  aiConfidence: z.number().min(0).max(1).optional().nullable(),
  companyId: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  uploaderUserId: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().optional().nullable(),
  rejectReason: z.string().optional().nullable(),
});
export type ReviewListItem = z.infer<typeof ReviewListItemSchema>;

export const ReviewDetailSchema = ReviewListItemSchema.extend({
  note: z.string().optional().nullable(),
});
export type ReviewDetail = z.infer<typeof ReviewDetailSchema>;

export const ConfirmRequestSchema = z
  .object({
    note: z.string().trim().max(500).optional(),
  })
  .optional()
  .default({});
export type ConfirmRequest = z.infer<typeof ConfirmRequestSchema>;

export const RejectRequestSchema = z.object({
  reason: z.string().trim().min(1, "差戻し理由は必須です").max(500),
});
export type RejectRequest = z.infer<typeof RejectRequestSchema>;
