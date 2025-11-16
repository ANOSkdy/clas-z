import { describe, expect, it } from "vitest";
import { autoDetectDelimiter, headersToIndex, normalizeAmount, parseCSV, rowsToTBLines } from "@/lib/csv";

describe("csv parsing", () => {
  it("parses quoted values and newlines", () => {
    const csv = 'code,account,debit\n"100","現金",1\n"200","売上高",0';
    const rows = parseCSV(csv, ",");
    expect(rows).toEqual([
      ["code", "account", "debit"],
      ["100", "現金", "1"],
      ["200", "売上高", "0"],
    ]);
  });

  it("detects delimiter", () => {
    const csv = "code;account;debit\n100;Cash;100";
    expect(autoDetectDelimiter(csv)).toBe(";");
  });

  it("normalizes amounts", () => {
    expect(normalizeAmount("1,200")).toBe(1200);
    expect(normalizeAmount("(300)")).toBe(-300);
    expect(normalizeAmount("▲500")).toBe(-500);
    expect(normalizeAmount(" ¥9,999 ")).toBe(9999);
  });

  it("maps header synonyms", () => {
    const headers = ["科目コード", "勘定科目", "借方金額", "貸方金額", "備考"];
    const index = headersToIndex(headers);
    expect(index.accountCode).toBe(0);
    expect(index.accountName).toBe(1);
    expect(index.debit).toBe(2);
    expect(index.credit).toBe(3);
    expect(index.note).toBe(4);
  });

  it("maps headers and creates TB lines", () => {
    const csv = "科目コード,勘定科目,借方,貸方\n100,現金,1200,0\n200,売上高,0,1200";
    const rows = parseCSV(csv, ",");
    const lines = rowsToTBLines(rows, true);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ accountCode: "100", accountName: "現金", debit: 1200, credit: 0 });
    expect(lines[1]).toMatchObject({ accountCode: "200", credit: 1200 });
  });

  it("falls back to positional mapping when headers missing", () => {
    const csv = "100,現金,1200,0\n200,売上,0,1200";
    const rows = parseCSV(csv, ",");
    const lines = rowsToTBLines(rows, true);
    expect(lines[0].accountCode).toBe("100");
  });
});
