"use client";

import { useMemo, useState } from "react";
import type { TBLine } from "@/lib/schemas/tb";
import { computeStats } from "@/lib/tb";
import TBGrid from "./TBGrid";
import TBSendModal from "./TBSendModal";

type TBEditorProps = {
  tbId: string;
  initialLines: TBLine[];
};

export default function TBEditor({ tbId, initialLines }: TBEditorProps) {
  const [lines, setLines] = useState<TBLine[]>(initialLines);
  const [status, setStatus] = useState<"draft" | "ready" | "sent" | "error">("draft");
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);

  const recomputeStats = useMemo(() => computeStats(lines), [lines]);

  const handleSave = async () => {
    setSaving(true);
    setAlert(null);
    setError(null);
    try {
      const response = await fetch(`/api/tb/${tbId}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "保存に失敗しました");
      }
      setAlert("保存しました");
      const nextStatus = payload?.header?.status ?? (payload?.totals?.balanced ? "ready" : "error");
      setStatus(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (recipients: string[], message: string) => {
    const response = await fetch(`/api/tb/${tbId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients, message }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? "送付に失敗しました");
    }
    setStatus("sent");
    setAlert("送付しました");
  };

  return (
    <div className="card space-y-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[color:var(--color-text-muted)]">TB ID</span>
          <span className="font-mono">{tbId}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${status === "ready" ? "chip-active" : ""}`}>状態: {status}</span>
          <button type="button" className="btn-secondary" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "Airtable へ保存"}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setSendOpen(true)}
            disabled={!recomputeStats.balanced || !lines.length}
          >
            送付モーダルを開く
          </button>
        </div>
      </div>
      <TBGrid
        lines={lines}
        onChange={(next) => {
          setLines(next);
          setAlert(null);
        }}
      />
      {alert ? <p className="text-sm text-green-700">{alert}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <TBSendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSend={async (recipients, message) => {
          await handleSend(recipients, message);
        }}
      />
    </div>
  );
}
