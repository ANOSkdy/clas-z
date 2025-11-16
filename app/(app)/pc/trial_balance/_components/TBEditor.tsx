"use client";

import { useEffect, useMemo, useState } from "react";

import { TBLine } from "@/lib/schemas/tb";

import { TBGrid } from "./TBGrid";
import { TBSendModal } from "./TBSendModal";

export type TBEditorProps = {
  tbId: string;
  initialLines: TBLine[];
  onStatusChange?: (status: string) => void;
};

export function TBEditor({ tbId, initialLines, onStatusChange }: TBEditorProps) {
  const [lines, setLines] = useState<TBLine[]>(
    initialLines.length ? initialLines : [{ accountCode: "", accountName: "", debit: 0, credit: 0 }],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const totals = useMemo(() => {
    const debitTotal = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const creditTotal = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
    return { debitTotal, creditTotal, balanced: Math.abs(debitTotal - creditTotal) <= 0.5 };
  }, [lines]);

  useEffect(() => {
    setStatusMessage(null);
    setErrorMessage(null);
  }, [lines]);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/tb/${tbId}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error?.message ?? "保存に失敗しました");
      }
      setStatusMessage(totals.balanced ? "保存済み (貸借一致)" : "保存済み (要確認)");
      setLastSavedAt(new Date().toLocaleTimeString());
      onStatusChange?.("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存に失敗しました";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async (payload: { recipients: string[]; message?: string }) => {
    setIsSending(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/tb/${tbId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error?.message ?? "送付に失敗しました");
      }
      setStatusMessage("送付済み");
      onStatusChange?.("sent");
    } catch (error) {
      const message = error instanceof Error ? error.message : "送付に失敗しました";
      setErrorMessage(message);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="card space-y-5" aria-labelledby="tb-editor-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">editor</p>
          <h2 id="tb-editor-heading" className="text-lg font-semibold">
            行編集と送付
          </h2>
          <p className="text-xs text-[color:var(--color-text-muted)]">TB ID: {tbId}</p>
        </div>
        <div className="space-y-1 text-right text-xs">
          <p>借方: {totals.debitTotal.toLocaleString()}</p>
          <p>貸方: {totals.creditTotal.toLocaleString()}</p>
          {lastSavedAt && <p className="text-[color:var(--color-text-muted)]">最終保存: {lastSavedAt}</p>}
        </div>
      </div>

      <TBGrid lines={lines} onChange={setLines} />

      {statusMessage && (
        <p className="text-sm text-[color:var(--color-primary-plum-700)]" role="status">
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <p className="text-sm text-[color:var(--color-error-text,#991B1B)]" role="status">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[color:var(--color-text-muted)]" aria-live="polite">
          {totals.balanced ? "貸借一致" : "貸借差額を確認してください"}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secondary text-sm" onClick={() => setSendOpen(true)} disabled={isSaving}>
            送付モーダル
          </button>
          <button type="button" className="btn-primary text-sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "保存中..." : "行を保存"}
          </button>
        </div>
      </div>

      <TBSendModal open={sendOpen} onClose={() => setSendOpen(false)} onSubmit={handleSend} isSubmitting={isSending} />
    </div>
  );
}
