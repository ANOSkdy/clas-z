import { TBLine } from "./schemas/tb";

const HEADER_MAP: Record<keyof Pick<TBLine, "accountCode" | "accountName" | "note"> | "debit" | "credit", string[]> = {
  accountCode: ["code", "科目コード", "勘定コード", "勘定科目コード"],
  accountName: ["account", "科目", "勘定科目", "勘定科目名"],
  debit: ["debit", "借方", "借方金額"],
  credit: ["credit", "貸方", "貸方金額"],
  note: ["note", "摘要", "備考"],
};

const NEGATIVE_MARKERS = ["-", "▲", "△"];

export function autoDetectDelimiter(text: string): "," | ";" | "\t" {
  const sample = text.split(/\r?\n/).slice(0, 5);
  const delimiters: Array<"," | ";" | "\t"> = [",", ";", "\t"];
  const counts = delimiters.map((delim) =>
    sample.reduce((acc, line) => acc + (line.split(delim).length - 1), 0),
  );
  const max = Math.max(...counts);
  const index = counts.findIndex((count) => count === max && count > 0);
  return index >= 0 ? delimiters[index] : ",";
}

export function parseCSV(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      current += "\"";
      i += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    const isDelimiter = char === delimiter && !inQuotes;
    const isNewLine = (char === "\n" || char === "\r") && !inQuotes;

    if (isDelimiter) {
      row.push(current);
      current = "";
      continue;
    }

    if (isNewLine) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  rows.push(row);
  return rows.filter((cols) => cols.some((value) => value.trim().length > 0));
}

function normalizeHeaderKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[（）()]/g, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf]/gi, "");
}

export function headersToIndex(headers: string[]): {
  accountCode?: number;
  accountName?: number;
  debit?: number;
  credit?: number;
  note?: number;
} {
  const map: {
    accountCode?: number;
    accountName?: number;
    debit?: number;
    credit?: number;
    note?: number;
  } = {};

  headers.forEach((header, index) => {
    const normalized = normalizeHeaderKey(header);
    Object.entries(HEADER_MAP).forEach(([key, variants]) => {
      if (variants.some((variant) => normalizeHeaderKey(variant) === normalized)) {
        (map as Record<string, number>)[key] = index;
      }
    });
  });

  return map;
}

export function normalizeAmount(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  let raw = String(value).trim();
  if (!raw) return 0;

  let isNegative = false;
  if (raw.startsWith("(") && raw.endsWith(")")) {
    isNegative = true;
    raw = raw.slice(1, -1);
  }
  NEGATIVE_MARKERS.forEach((marker) => {
    if (raw.includes(marker)) {
      isNegative = true;
      raw = raw.replace(new RegExp(`\\${marker}`, "g"), "");
    }
  });

  raw = raw.replace(/[¥￥$€£,\s]/g, "");
  raw = raw.replace(/%/g, "");

  if (raw.startsWith("+")) raw = raw.slice(1);
  if (raw.startsWith("-")) {
    isNegative = true;
    raw = raw.slice(1);
  }

  const normalized = raw.replace(/[^0-9.]/g, "");
  if (!normalized) return 0;
  const amount = Number(normalized);
  if (Number.isNaN(amount)) {
    throw new Error(`数値の解釈に失敗しました: ${value}`);
  }
  return isNegative ? -amount : amount;
}

function deriveDefaultMapping(columnCount: number) {
  return {
    accountCode: columnCount >= 1 ? 0 : undefined,
    accountName: columnCount >= 2 ? 1 : undefined,
    debit: columnCount >= 3 ? 2 : undefined,
    credit: columnCount >= 4 ? 3 : undefined,
    note: columnCount >= 5 ? 4 : undefined,
  } satisfies ReturnType<typeof headersToIndex>;
}

export function rowsToTBLines(rows: string[][], headerRow: boolean): TBLine[] {
  if (!rows.length) return [];

  const mapping = headerRow ? headersToIndex(rows[0]) : deriveDefaultMapping(rows[0]?.length ?? 0);
  const startIndex = headerRow ? 1 : 0;

  if (typeof mapping.accountName !== "number" || typeof mapping.debit !== "number" || typeof mapping.credit !== "number") {
    throw new Error("必要な見出し (勘定科目 / 借方 / 貸方) を検出できませんでした");
  }

  const lines: TBLine[] = [];

  for (let i = startIndex; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((cell) => !cell || cell.trim() === "")) {
      continue;
    }

    const accountName = row[mapping.accountName]?.trim();
    if (!accountName) {
      throw new Error(`${i + 1} 行目の勘定科目が空です`);
    }

    const debit = normalizeAmount(row[mapping.debit] ?? "0");
    const credit = normalizeAmount(row[mapping.credit] ?? "0");

    if (!Number.isFinite(debit) || !Number.isFinite(credit)) {
      throw new Error(`${i + 1} 行目の金額が不正です`);
    }

    const accountCode = typeof mapping.accountCode === "number" ? row[mapping.accountCode]?.trim() ?? "" : "";
    const note = typeof mapping.note === "number" ? row[mapping.note]?.trim() ?? undefined : undefined;

    lines.push({
      accountCode,
      accountName,
      debit,
      credit,
      note,
    });
  }

  return lines;
}
