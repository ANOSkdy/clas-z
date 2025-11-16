import { z } from "zod";

export const TBLineSchema = z.object({
  accountCode: z.string().optional().default(""),
  accountName: z.string().min(1, "勘定科目は必須です"),
  debit: z.number().finite(),
  credit: z.number().finite(),
  note: z.string().optional(),
});

export type TBLine = z.infer<typeof TBLineSchema>;

export const TBStatusValues = ["draft", "ready", "sent", "error"] as const;
export type TBStatus = (typeof TBStatusValues)[number];

export const TBHeaderSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  currency: z.union([z.literal("JPY"), z.literal("USD"), z.string().min(1)]),
  status: z.enum(TBStatusValues),
});

export type TBHeader = z.infer<typeof TBHeaderSchema>;

export const ParseCsvRequestSchema = z.object({
  csv: z.string().min(1, "CSV コンテンツが必要です"),
  delimiter: z.enum([",", ";", "\t"]).optional(),
  header: z.boolean().default(true),
});
export type ParseCsvRequest = z.infer<typeof ParseCsvRequestSchema>;

export const ExtractPdfRequestSchema = z.object({
  blobUrl: z.string().url("blobUrl は URL 形式で入力してください"),
  language: z.string().min(2).max(8).optional(),
});
export type ExtractPdfRequest = z.infer<typeof ExtractPdfRequestSchema>;

export const CreateTBRequestSchema = z.object({
  companyId: z.string().min(1).optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  currency: z.string().min(1).default("JPY"),
  source: z.enum(["csv", "pdf"]),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type CreateTBRequest = z.infer<typeof CreateTBRequestSchema>;

export const UpsertLinesRequestSchema = z.object({
  lines: z.array(TBLineSchema).max(5000, "一度に 5,000 行まで保存できます"),
});
export type UpsertLinesRequest = z.infer<typeof UpsertLinesRequestSchema>;

export const SendRequestSchema = z.object({
  recipients: z.array(z.string().email()).min(1, "宛先を 1 件以上入力してください"),
  message: z.string().optional(),
});
export type SendRequest = z.infer<typeof SendRequestSchema>;

export type ApiError = {
  error: { code: string; message: string };
  correlationId: string;
};
