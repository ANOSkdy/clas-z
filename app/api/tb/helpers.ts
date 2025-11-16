import { TBHeaderSchema } from "@/lib/schemas/tb";

export const TB_TABLE = "TrialBalances";
export const TB_LINE_TABLE = "TrialBalanceLines";

export type TrialBalanceRecordFields = {
  CompanyId: string;
  PeriodStart?: string;
  PeriodEnd?: string;
  Currency?: string;
  Status: string;
  Source?: string;
  Meta?: Record<string, unknown>;
  DebitTotal?: number;
  CreditTotal?: number;
  LineCount?: number;
  LastSentAt?: string;
};

export type TrialBalanceLineRecordFields = {
  TrialBalanceId: string;
  AccountCode: string;
  AccountName: string;
  Debit: number;
  Credit: number;
  Note?: string;
  MinorDebit?: number;
  MinorCredit?: number;
};

export function mapHeader(record: { id: string; fields: TrialBalanceRecordFields }) {
  return TBHeaderSchema.parse({
    id: record.id,
    companyId: record.fields.CompanyId,
    periodStart: record.fields.PeriodStart,
    periodEnd: record.fields.PeriodEnd,
    currency: record.fields.Currency ?? "JPY",
    status: (record.fields.Status as "draft" | "ready" | "sent" | "error") ?? "draft",
  });
}
