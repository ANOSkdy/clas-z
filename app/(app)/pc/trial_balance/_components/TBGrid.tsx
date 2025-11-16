"use client";

import { useMemo } from "react";

import { TBLine } from "@/lib/schemas/tb";

export type TBGridProps = {
  lines: TBLine[];
  onChange: (lines: TBLine[]) => void;
};

export function TBGrid({ lines, onChange }: TBGridProps) {
  const totals = useMemo(() => {
    const debitTotal = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const creditTotal = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
    return { debitTotal, creditTotal, balanced: Math.abs(debitTotal - creditTotal) <= 0.5 };
  }, [lines]);

  const handleCellChange = (index: number, key: keyof TBLine, value: string) => {
    const next = [...lines];
    if (key === "debit" || key === "credit") {
      const numeric = Number(value);
      next[index] = { ...next[index], [key]: Number.isFinite(numeric) ? numeric : 0 };
    } else {
      next[index] = { ...next[index], [key]: value };
    }
    onChange(next);
  };

  const handleAddRow = () => {
    onChange([...lines, { accountCode: "", accountName: "", debit: 0, credit: 0 }]);
  };

  const handleDeleteRow = (index: number) => {
    const next = lines.filter((_, idx) => idx !== index);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-auto border border-[color:var(--color-border)] rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-[color:var(--color-surface-muted)] text-left text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
            <tr>
              <th className="px-3 py-2">コード</th>
              <th className="px-3 py-2">勘定科目</th>
              <th className="px-3 py-2 text-right">借方</th>
              <th className="px-3 py-2 text-right">貸方</th>
              <th className="px-3 py-2">摘要</th>
              <th className="px-3 py-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-[color:var(--color-border)]">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={line.accountCode}
                    onChange={(event) => handleCellChange(index, "accountCode", event.target.value)}
                    className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1 text-sm"
                    aria-label={`行 ${index + 1} の勘定コード`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={line.accountName}
                    onChange={(event) => handleCellChange(index, "accountName", event.target.value)}
                    className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1 text-sm"
                    aria-label={`行 ${index + 1} の勘定科目`}
                    required
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={line.debit}
                    onChange={(event) => handleCellChange(index, "debit", event.target.value)}
                    className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1 text-sm text-right"
                    aria-label={`行 ${index + 1} の借方金額`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={line.credit}
                    onChange={(event) => handleCellChange(index, "credit", event.target.value)}
                    className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1 text-sm text-right"
                    aria-label={`行 ${index + 1} の貸方金額`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={line.note ?? ""}
                    onChange={(event) => handleCellChange(index, "note", event.target.value)}
                    className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1 text-sm"
                    aria-label={`行 ${index + 1} の摘要`}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteRow(index)}
                    className="text-xs text-[color:var(--color-primary-plum-700)] underline"
                    aria-label={`行 ${index + 1} を削除`}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-x-3 text-sm">
          <span>借方合計: {totals.debitTotal.toLocaleString()}</span>
          <span>貸方合計: {totals.creditTotal.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              totals.balanced
                ? "bg-[color:var(--color-primary-salmon-100)] text-[color:var(--color-primary-salmon-800)]"
                : "bg-[color:var(--color-error-bg,#FEE2E2)] text-[color:var(--color-error-text,#991B1B)]"
            }`}
            aria-live="polite"
          >
            {totals.balanced ? "Balanced" : "Unbalanced"}
          </span>
          <button type="button" onClick={handleAddRow} className="btn-secondary text-sm">
            行を追加
          </button>
        </div>
      </div>
    </div>
  );
}
