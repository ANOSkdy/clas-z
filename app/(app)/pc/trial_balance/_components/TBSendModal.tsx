"use client";

import { useMemo, useState } from "react";

type SendModalProps = {
  open: boolean;
  onClose: () => void;
  onSend: (recipients: string[], message: string) => Promise<void> | void;
};

function tokenize(value: string) {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function TBSendModal({ open, onClose, onSend }: SendModalProps) {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokens = useMemo(() => tokenize(input), [input]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!tokens.length) {
      setError("宛先を入力してください");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSend(tokens, message);
      setInput("");
      setMessage("");
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "送付に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">試算表を送付</h2>
          <button type="button" onClick={handleClose} aria-label="閉じる" className="text-sm text-[color:var(--color-text-muted)]">
            ✕
          </button>
        </div>
        <label className="space-y-1 text-sm">
          <span className="text-[color:var(--color-text-muted)]">宛先 (カンマ/スペース区切り)</span>
          <input
            className="input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="example@company.co.jp"
          />
        </label>
        {tokens.length ? (
          <div className="flex flex-wrap gap-2" aria-live="polite">
            {tokens.map((token) => (
              <span key={token} className="chip chip-active text-xs">
                {token}
              </span>
            ))}
          </div>
        ) : null}
        <label className="space-y-1 text-sm">
          <span className="text-[color:var(--color-text-muted)]">メッセージ (任意)</span>
          <textarea className="input h-24" value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex items-center gap-3">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            キャンセル
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? "送信中..." : "送信"}
          </button>
        </div>
      </div>
    </div>
  );
}
