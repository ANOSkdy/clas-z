import { z } from "zod";

export const RatingLevel = z.enum(["A", "B", "C", "D"]);
export type RatingLevel = z.infer<typeof RatingLevel>;

export const RatingBreakdown = z.object({
  confidence: z.number(),
  statusBonus: z.number(),
  metaCompleteness: z.number(),
  speedBonus: z.number(),
});
export type RatingBreakdown = z.infer<typeof RatingBreakdown>;

export const DocumentRating = z.object({
  documentId: z.string(),
  companyId: z.string(),
  score: z.number().min(0).max(100),
  level: RatingLevel,
  breakdown: RatingBreakdown,
  computedAt: z.string(),
});
export type DocumentRating = z.infer<typeof DocumentRating>;

export const CompanyRating = z.object({
  companyId: z.string(),
  score: z.number().min(0).max(100),
  level: RatingLevel,
  computedAt: z.string(),
  docs: z.array(DocumentRating).optional(),
});
export type CompanyRating = z.infer<typeof CompanyRating>;

export const ComputeRequest = z.object({
  scope: z.enum(["document", "company", "all"]),
  documentId: z.string().optional(),
  companyId: z.string().optional(),
  dryRun: z.boolean().optional(),
  reason: z.string().optional(),
});
export type ComputeRequest = z.infer<typeof ComputeRequest>;

export const Events = z.object({
  type: z.string(),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.any()).optional(),
});
export type Events = z.infer<typeof Events>;

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  correlationId: z.string(),
});
export type ApiError = z.infer<typeof ApiError>;
