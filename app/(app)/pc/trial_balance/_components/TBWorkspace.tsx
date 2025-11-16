"use client";

import { useState } from "react";
import type { TBLine } from "@/lib/schemas/tb";
import type { TBStats } from "@/lib/tb";
import ImportPanel from "./ImportPanel";
import TBEditor from "./TBEditor";

export default function TBWorkspace() {
  const [lines, setLines] = useState<TBLine[]>([]);
  const [stats, setStats] = useState<TBStats | null>(null);
  const [source, setSource] = useState<"csv" | "pdf" | null>(null);
  const [tbId, setTbId] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [currency, setCurrency] = useState("JPY");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleImport = (nextLines: TBLine[], nextStats: TBStats, nextSource: "csv" | "pdf") => {
    setLines(nextLines);
    setStats(nextStats);
    setSource(nextSource);
    setTbId(null);
    setMessage(`解析しました: ${nextLines.length} 行`);
    setError(null);
  };

  const handleCreate = async () => {
    if (!lines.length || !source) {
      setError("先に CSV または PDF を取り込んでください");
      return;
    }
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/tb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: periodStart || undefined,
          periodEnd: periodEnd || undefined,
          currency,
          source,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.tbId) {
        throw new Error(payload?.error?.message ?? "TB の作成に失敗しました");
      }
      setTbId(payload.tbId);
      setMessage("TB を作成しました。行を保存してください");
    } catch (err) {
      setError(err instanceof Error ? err.message : "TB の作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImportPanel onImport={handleImport} stats={stats} />
      <div className="card space-y-4" aria-live="polite">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--color-text-muted)]">期首 (YYYY-MM-DD)</span>
            <input
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              className="input"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--color-text-muted)]">期末 (YYYY-MM-DD)</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              className="input"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--color-text-muted)]">通貨</span>
            <select
              className="input"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              <option value="JPY">JPY</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={handleCreate}
            disabled={creating || !lines.length}
          >
            {creating ? "作成中..." : "TB を作成"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
        </div>
      </div>
      {tbId && lines.length ? (
        <TBEditor key={tbId} tbId={tbId} initialLines={lines} />
      ) : (
        <p className="text-sm text-[color:var(--color-text-muted)]">
          解析したデータと期間を入力して TB を作成すると編集パネルが表示されます。
        </p>
      )}
    </div>
  );
}
