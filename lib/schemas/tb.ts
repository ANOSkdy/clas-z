import { z } from "zod";

export const TBLineSchema = z.object({
  accountCode: z.string().min(1, "科目コードが必要です"),
  accountName: z.string().min(1, "勘定科目名が必要です"),
  debit: z.number(),
  credit: z.number(),
  note: z.string().optional(),
});
export type TBLine = z.infer<typeof TBLineSchema>;

export const TBHeaderSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  currency: z.string().min(1).default("JPY"),
  status: z.enum(["draft", "ready", "sent", "error"]),
});
export type TBHeader = z.infer<typeof TBHeaderSchema>;

export const ParseCsvRequestSchema = z.object({
  csv: z.string().min(1, "CSV 本文が必要です"),
  delimiter: z.enum([",", ";", "\t"]).optional(),
  header: z.boolean().optional(),
});
export type ParseCsvRequest = z.infer<typeof ParseCsvRequestSchema>;

export const ExtractPdfRequestSchema = z.object({
  blobUrl: z.string().url("blobUrl は URL 形式"),
  language: z.string().optional(),
});
export type ExtractPdfRequest = z.infer<typeof ExtractPdfRequestSchema>;

export const CreateTBRequestSchema = z.object({
  companyId: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  currency: z.string().min(1).optional(),
  source: z.enum(["csv", "pdf"]),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type CreateTBRequest = z.infer<typeof CreateTBRequestSchema>;

export const UpsertLinesRequestSchema = z.object({
  lines: z.array(TBLineSchema).min(1, "1 行以上必要です"),
});
export type UpsertLinesRequest = z.infer<typeof UpsertLinesRequestSchema>;

export const SendRequestSchema = z.object({
  recipients: z.array(z.string().email()).min(1, "宛先を 1 件以上入力してください"),
  message: z.string().optional(),
});
export type SendRequest = z.infer<typeof SendRequestSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  correlationId: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
