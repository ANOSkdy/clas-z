import { TBLine } from "./schemas/tb";

const HEADER_SYNONYMS: Record<string, keyof TBLine> = {
  code: "accountCode",
  "科目コード": "accountCode",
  "勘定コード": "accountCode",
  account: "accountName",
  "科目": "accountName",
  "勘定科目": "accountName",
  "勘定科目名": "accountName",
  debit: "debit",
  "借方": "debit",
  "借方金額": "debit",
  credit: "credit",
  "貸方": "credit",
  "貸方金額": "credit",
  note: "note",
  "摘要": "note",
  "備考": "note",
};

const NUMERIC_CLEANUP = /[\s,¥$€£₩₱₹฿₫]/g;
const NEGATIVE_HINT = /^(?:\(|▲|△)/;

export function autoDetectDelimiter(text: string): "," | ";" | "\t" {
  const sample = text.split(/\r?\n/, 5).join("\n");
  const delimiters: Array<"," | ";" | "\t"> = [",", ";", "\t"];
  const best = delimiters
    .map((delim) => ({ delim, count: (sample.match(new RegExp(`${delim}`, "g")) ?? []).length }))
    .sort((a, b) => b.count - a.count)[0];
  return best?.count ? best.delim : ",";
}

export function parseCSV(text: string, delimiter: string = ","): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === "\"") {
        if (next === "\"") {
          field += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      continue;
    }

    if (char === "\r") {
      continue;
    }

    if (char === "\n") {
      current.push(field);
      rows.push(current);
      current = [];
      field = "";
      continue;
    }

    if (char === delimiter) {
      current.push(field);
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field);
  }
  if (current.length) {
    rows.push(current);
  }

  return rows.filter((row) => row.some((col) => col.trim().length));
}

export function headersToIndex(headers: string[]): {
  accountCode?: number;
  accountName?: number;
  debit?: number;
  credit?: number;
  note?: number;
} {
  const index: Record<string, number | undefined> = {};
  headers.forEach((header, idx) => {
    const key = header.trim().replace(/["'\s]/g, "").toLowerCase();
    const synonym = Object.keys(HEADER_SYNONYMS).find(
      (candidate) => key === candidate.toLowerCase(),
    );
    if (synonym) {
      const mapped = HEADER_SYNONYMS[synonym];
      index[mapped] = idx;
    }
  });
  return index;
}

export function normalizeAmount(value: string): number {
  if (!value) return 0;
  let cleaned = value.trim();
  if (!cleaned) return 0;
  const negative = NEGATIVE_HINT.test(cleaned) || /-/.test(cleaned);
  cleaned = cleaned.replace(/[()▲△]/g, "");
  cleaned = cleaned.replace(NUMERIC_CLEANUP, "");
  cleaned = cleaned.replace(/％|%/g, "");
  if (!cleaned) return 0;
  const parsed = Number(cleaned.replace(/[^-0-9.]/g, ""));
  if (Number.isNaN(parsed)) {
    throw new Error(`数値を解釈できません: ${value}`);
  }
  return negative ? -parsed : parsed;
}

export function rowsToTBLines(rows: string[][], headerRow: boolean): TBLine[] {
  if (!rows.length) {
    return [];
  }
  let startIndex = 0;
  let headerIndexes: ReturnType<typeof headersToIndex> | null = null;
  if (headerRow) {
    headerIndexes = headersToIndex(rows[0]);
    const hasHeader = Object.values(headerIndexes).some((value) => typeof value === "number");
    if (hasHeader) {
      startIndex = 1;
    } else {
      headerIndexes = null;
      startIndex = 0;
    }
  }
  const lines: TBLine[] = [];
  for (let rowIdx = startIndex; rowIdx < rows.length; rowIdx += 1) {
    const row = rows[rowIdx];
    if (!row?.length || row.every((col) => !col.trim())) {
      continue;
    }
    const accountCode = headerIndexes?.accountCode
      ? row[headerIndexes.accountCode]
      : row[0];
    const accountName = headerIndexes?.accountName
      ? row[headerIndexes.accountName]
      : row[1];
    const debitStr = headerIndexes?.debit
      ? row[headerIndexes.debit]
      : row[2];
    const creditStr = headerIndexes?.credit
      ? row[headerIndexes.credit]
      : row[3];
    const noteStr = headerIndexes?.note ? row[headerIndexes.note] : row[4];

    if (!accountCode?.trim() || !accountName?.trim()) {
      throw new Error(`行 ${rowIdx + 1} に科目コードまたは勘定科目名がありません`);
    }
    const debit = normalizeAmount(debitStr ?? "0");
    const credit = normalizeAmount(creditStr ?? "0");

    lines.push({
      accountCode: accountCode.trim(),
      accountName: accountName.trim(),
      debit,
      credit,
      note: noteStr?.trim() || undefined,
    });
  }

  if (!lines.length) {
    throw new Error("有効な行がありません");
  }

  return lines;
}
