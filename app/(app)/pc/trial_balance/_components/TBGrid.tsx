"use client";

import { useMemo } from "react";
import type { TBLine } from "@/lib/schemas/tb";
import { computeStats } from "@/lib/tb";

const columns: Array<{ key: keyof TBLine; label: string; type?: string }> = [
  { key: "accountCode", label: "科目コード" },
  { key: "accountName", label: "勘定科目" },
  { key: "debit", label: "借方", type: "number" },
  { key: "credit", label: "貸方", type: "number" },
  { key: "note", label: "摘要" },
];

type TBGridProps = {
  lines: TBLine[];
  onChange: (next: TBLine[]) => void;
};

export default function TBGrid({ lines, onChange }: TBGridProps) {
  const stats = useMemo(() => computeStats(lines), [lines]);

  const handleChange = (index: number, key: keyof TBLine, value: string) => {
    const next = lines.map((line, idx) => {
      if (idx !== index) return line;
      if (key === "debit" || key === "credit") {
        return { ...line, [key]: Number(value) } as TBLine;
      }
      return { ...line, [key]: value } as TBLine;
    });
    onChange(next);
  };

  const handleAddRow = () => {
    onChange([
      ...lines,
      { accountCode: "", accountName: "", debit: 0, credit: 0, note: "" },
    ]);
  };

  const handleRemove = (index: number) => {
    onChange(lines.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[color:var(--color-text-muted)]">
          {stats.count} 行 / 合計 借方 {stats.debitTotal.toLocaleString()} / 貸方 {stats.creditTotal.toLocaleString()}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-semibold ${stats.balanced ? "text-green-600" : "text-amber-600"}`}>
            {stats.balanced ? "貸借一致" : "差異あり"}
          </span>
          <button type="button" className="btn-secondary" onClick={handleAddRow}>
            行を追加
          </button>
        </div>
      </div>
      <div className="overflow-auto rounded-lg border border-[color:var(--color-border)]">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key as string} className="bg-[color:var(--color-surface-muted)] px-3 py-2 font-medium">
                  {column.label}
                </th>
              ))}
              <th className="bg-[color:var(--color-surface-muted)] px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={`${line.accountCode}-${index}`} className="border-t border-[color:var(--color-border)]">
                {columns.map((column) => (
                  <td key={column.key as string} className="px-3 py-1">
                    <input
                      type={column.type ?? "text"}
                      inputMode={column.type === "number" ? "decimal" : undefined}
                      value={String(line[column.key] ?? "")}
                      onChange={(event) => handleChange(index, column.key, event.target.value)}
                      className="input h-9"
                    />
                  </td>
                ))}
                <td className="px-3 py-1">
                  <button type="button" className="text-xs text-red-600" onClick={() => handleRemove(index)}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
