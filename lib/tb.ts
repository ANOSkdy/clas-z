import { TBLine } from "./schemas/tb";

export type TBStats = {
  count: number;
  debitTotal: number;
  creditTotal: number;
  balanced: boolean;
};

export const MAX_TB_LINES = 5000;
export const BALANCE_TOLERANCE = 0.5;

export function computeStats(lines: TBLine[]): TBStats {
  const totals = lines.reduce(
    (acc, line) => {
      acc.debitTotal += line.debit || 0;
      acc.creditTotal += line.credit || 0;
      return acc;
    },
    { debitTotal: 0, creditTotal: 0 },
  );
  return {
    count: lines.length,
    debitTotal: Number(totals.debitTotal.toFixed(2)),
    creditTotal: Number(totals.creditTotal.toFixed(2)),
    balanced: Math.abs(totals.debitTotal - totals.creditTotal) <= BALANCE_TOLERANCE,
  };
}

export function ensureLineLimit(lines: TBLine[]): void {
  if (lines.length > MAX_TB_LINES) {
    throw new Error(`Trial Balance は ${MAX_TB_LINES} 行までです`);
  }
}

export function toMinorUnits(value: number, currency: string): number {
  const digits = currency?.toUpperCase() === "JPY" ? 0 : 2;
  return Math.round(value * 10 ** digits);
}
