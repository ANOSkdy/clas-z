import { z } from "zod";

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }
    return value;
  }, schema);

const OptionalStringSchema = emptyToUndefined(z.string().trim().min(1, "1 文字以上入力してください")).optional();
const OptionalEmailSchema = emptyToUndefined(z.string().trim().email("メールアドレス形式で入力してください")).optional();

export const CustomerProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  notificationEmail: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  updatedAt: z.string(),
});
export type CustomerProfile = z.infer<typeof CustomerProfileSchema>;

export const CustomerUpdateRequestSchema = z.object({
  displayName: z.string().trim().min(1, "表示名は必須です"),
  email: z.string().trim().email("メールアドレス形式で入力してください"),
  phone: OptionalStringSchema,
  notificationEmail: OptionalEmailSchema,
});
export type CustomerUpdateRequest = z.infer<typeof CustomerUpdateRequestSchema>;

export const CompanyStatusValues = ["active", "deleted"] as const;
export type CompanyStatus = (typeof CompanyStatusValues)[number];

export const CompanySettingsSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  legalName: z.string().optional(),
  billingEmail: z.string().email().optional(),
  timezone: z.string().optional(),
  taxId: z.string().optional(),
  status: z.enum(CompanyStatusValues),
  deletedAt: z.string().optional(),
  updatedAt: z.string(),
});
export type CompanySettings = z.infer<typeof CompanySettingsSchema>;

export const CompanyUpdateRequestSchema = z.object({
  name: z.string().trim().min(1, "会社名は必須です"),
  legalName: OptionalStringSchema,
  billingEmail: OptionalEmailSchema,
  timezone: OptionalStringSchema,
  taxId: OptionalStringSchema,
});
export type CompanyUpdateRequest = z.infer<typeof CompanyUpdateRequestSchema>;

export const CompanyDeleteRequestSchema = z.object({
  typedName: z.string().min(1, "会社名を入力してください"),
  confirmPhrase: z.literal("DELETE"),
});
export type CompanyDeleteRequest = z.infer<typeof CompanyDeleteRequestSchema>;

export const CompanyRestoreRequestSchema = z.object({}).optional().default({});
export type CompanyRestoreRequest = z.infer<typeof CompanyRestoreRequestSchema>;

export type ApiError = {
  error: { code: string; message: string };
  correlationId: string;
};
