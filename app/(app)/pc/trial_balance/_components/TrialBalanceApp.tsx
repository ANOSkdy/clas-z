"use client";

import { useState } from "react";

import { TBLine } from "@/lib/schemas/tb";

import { ImportPanel, ImportStats } from "./ImportPanel";
import { TBEditor } from "./TBEditor";

export function TrialBalanceApp() {
  const [meta, setMeta] = useState<{ periodStart?: string; periodEnd?: string; currency: string }>({
    currency: "JPY",
  });
  const [lines, setLines] = useState<TBLine[]>([]);
  const [tbId, setTbId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleLinesParsed = ({ lines: parsedLines }: {
    lines: TBLine[];
    stats: ImportStats;
  }) => {
    setLines(parsedLines);
    setStatusMessage(null);
  };

  const handleCreateTB = async ({ lines: preparedLines, source: preparedSource }: {
    lines: TBLine[];
    source: "csv" | "pdf";
    stats?: ImportStats | null;
  }) => {
    if (!preparedLines.length) {
      setStatusMessage("行データを読み込んでから作成してください");
      return;
    }
    try {
      setIsCreating(true);
      setStatusMessage(null);
      const response = await fetch("/api/tb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: meta.periodStart || undefined,
          periodEnd: meta.periodEnd || undefined,
          currency: meta.currency,
          source: preparedSource,
          meta: { importCount: preparedLines.length },
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error?.message ?? "試算表の作成に失敗しました");
      }
      setTbId(json.tbId as string);
      setLines(preparedLines);
      setStatusMessage("試算表を作成しました。行を編集し保存してください。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "試算表の作成に失敗しました";
      setStatusMessage(message);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImportPanel
        meta={meta}
        onMetaChange={setMeta}
        onLinesParsed={handleLinesParsed}
        onCreateTB={handleCreateTB}
        isCreating={isCreating}
      />

      {statusMessage && (
        <p className="text-sm text-[color:var(--color-text-muted)]" role="status">
          {statusMessage}
        </p>
      )}

      {tbId && <TBEditor tbId={tbId} initialLines={lines} />}
    </div>
  );
}
