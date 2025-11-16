import {
  AirtableRecord,
  createRecord,
  createRecordsBatch,
  deleteRecordsBatch,
  getRecord,
  listRecords,
  updateRecord,
} from "./airtable";
import { TBHeader, TBLine, TBStatus, TBStatusValues } from "./schemas/tb";

export const TRIAL_BALANCES_TABLE = "TrialBalances";
export const TRIAL_BALANCE_LINES_TABLE = "TrialBalanceLines";

export type TrialBalanceRecordFields = {
  CompanyId: string;
  PeriodStart?: string;
  PeriodEnd?: string;
  Currency?: string;
  Status: TBStatus;
  Source?: string;
  Meta?: string;
  DebitTotal?: number;
  CreditTotal?: number;
  LineCount?: number;
  LastSentAt?: string;
};

export type TrialBalanceLineRecordFields = {
  TBId: string;
  AccountCode?: string;
  AccountName: string;
  Debit: number;
  Credit: number;
  Note?: string;
  LineNumber?: number;
};

export type Totals = {
  debitTotal: number;
  creditTotal: number;
  count: number;
  balanced: boolean;
};

export function mapTrialBalanceRecord(record: AirtableRecord<TrialBalanceRecordFields>): TBHeader {
  return {
    id: record.id,
    companyId: record.fields.CompanyId,
    periodStart: record.fields.PeriodStart,
    periodEnd: record.fields.PeriodEnd,
    currency: record.fields.Currency ?? "JPY",
    status: record.fields.Status ?? "draft",
  } satisfies TBHeader;
}

export function summarizeLines(lines: TBLine[]): Totals {
  const debitTotal = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const creditTotal = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  return {
    debitTotal,
    creditTotal,
    count: lines.length,
    balanced: Math.abs(debitTotal - creditTotal) <= 0.5,
  };
}

export async function listAllRecords<TFields extends Record<string, unknown>>(
  table: string,
  params?: Parameters<typeof listRecords<TFields>>[1],
): Promise<AirtableRecord<TFields>[]> {
  const items: AirtableRecord<TFields>[] = [];
  let offset: string | undefined;
  do {
    const response = await listRecords<TFields>(table, { ...params, offset });
    items.push(...response.records);
    offset = response.offset;
  } while (offset);
  return items;
}

export async function getTrialBalanceRecord(id: string): Promise<AirtableRecord<TrialBalanceRecordFields>> {
  const record = await getRecord<TrialBalanceRecordFields>(TRIAL_BALANCES_TABLE, id);
  return record;
}

export async function createTrialBalanceRecord(fields: TrialBalanceRecordFields) {
  return createRecord(TRIAL_BALANCES_TABLE, fields);
}

export async function listTrialBalanceRecords(params?: {
  companyId?: string;
  limit?: number;
  cursor?: string;
}) {
  const response = await listRecords<TrialBalanceRecordFields>(TRIAL_BALANCES_TABLE, {
    filterByFormula: params?.companyId ? `{CompanyId} = '${params.companyId}'` : undefined,
    maxRecords: params?.limit,
    pageSize: params?.limit,
    offset: params?.cursor,
    sort: [{ field: "createdTime", direction: "desc" }],
  });
  return response;
}

export async function replaceTrialBalanceLines(tbId: string, lines: TBLine[]): Promise<Totals> {
  const existing = await listAllRecords<TrialBalanceLineRecordFields>(TRIAL_BALANCE_LINES_TABLE, {
    filterByFormula: `{TBId} = '${tbId}'`,
  });
  if (existing.length) {
    await deleteRecordsBatch(TRIAL_BALANCE_LINES_TABLE, existing.map((item) => item.id));
  }

  if (lines.length) {
    await createRecordsBatch(
      TRIAL_BALANCE_LINES_TABLE,
      lines.map((line, index) => ({
        TBId: tbId,
        AccountCode: line.accountCode,
        AccountName: line.accountName,
        Debit: line.debit,
        Credit: line.credit,
        Note: line.note,
        LineNumber: index + 1,
      } satisfies TrialBalanceLineRecordFields)),
    );
  }

  const totals = summarizeLines(lines);

  await updateRecord<TrialBalanceRecordFields>(TRIAL_BALANCES_TABLE, tbId, {
    DebitTotal: totals.debitTotal,
    CreditTotal: totals.creditTotal,
    LineCount: totals.count,
    Status: totals.balanced ? "ready" : "error",
  });

  return totals;
}

export async function listTrialBalanceLines(tbId: string): Promise<TBLine[]> {
  const records = await listAllRecords<TrialBalanceLineRecordFields>(TRIAL_BALANCE_LINES_TABLE, {
    filterByFormula: `{TBId} = '${tbId}'`,
    sort: [{ field: "LineNumber", direction: "asc" }],
  });
  return records.map((record) => ({
    accountCode: record.fields.AccountCode ?? "",
    accountName: record.fields.AccountName,
    debit: record.fields.Debit,
    credit: record.fields.Credit,
    note: record.fields.Note,
  }));
}

export function validateStatus(value: string | null | undefined): TBStatus {
  if (!value) return "draft";
  if ((TBStatusValues as readonly string[]).includes(value)) {
    return value as TBStatus;
  }
  return "draft";
}
