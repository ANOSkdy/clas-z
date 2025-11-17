"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { recipients: string[]; message?: string }) => Promise<void>;
  isSubmitting: boolean;
};

const emailRegex = /\S+@\S+\.[\S]+/;

export function TBSendModal({ open, onClose, onSubmit, isSubmitting }: Props) {
  const [recipientInput, setRecipientInput] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setRecipientInput("");
      setMessage("");
      setError(null);
      setSubmitted(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && dialogRef.current) {
      const dialogEl = dialogRef.current;
      const focusables = dialogEl.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      focusables[0]?.focus();
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Tab" || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      dialogEl.addEventListener("keydown", handleKeyDown);
      return () => dialogEl.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  const recipients = useMemo(
    () =>
      recipientInput
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    [recipientInput],
  );

  const hasInvalidEmail = recipients.some((recipient) => !emailRegex.test(recipient));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!recipients.length) {
      setError("宛先を入力してください");
      return;
    }
    if (hasInvalidEmail) {
      setError("メールアドレスの形式を確認してください");
      return;
    }
    try {
      setError(null);
      await onSubmit({ recipients, message: message.trim() || undefined });
      onClose();
    } catch (submitError) {
      const messageText = submitError instanceof Error ? submitError.message : "送信に失敗しました";
      setError(messageText);
    }
  };

  if (!open) return null;

  const errorId = "tb-send-error";
  const descriptionId = "tb-send-description";

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tb-send-heading"
      aria-describedby={descriptionId}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 space-y-4">
        <header>
          <h2 id="tb-send-heading" className="text-lg font-semibold">
            試算表を送付
          </h2>
          <p id={descriptionId} className="text-sm text-[color:var(--color-text-muted)]">
            宛先とメッセージを入力して送信します。
          </p>
        </header>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="tb-send-recipients">
            宛先 (カンマまたはスペース区切り)
          </label>
          <input
            id="tb-send-recipients"
            type="text"
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            value={recipientInput}
            onChange={(event) => setRecipientInput(event.target.value)}
            placeholder="example@company.jp, finance@example.com"
            aria-invalid={submitted && (!!error || hasInvalidEmail || recipients.length === 0)}
            aria-errormessage={error ? errorId : undefined}
            required
          />
          <div className="flex flex-wrap gap-2 text-xs">
            {recipients.map((recipient) => (
              <span key={recipient} className="rounded-full bg-[color:var(--color-surface-muted)] px-3 py-1">
                {recipient}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="tb-send-message">
            メッセージ (任意)
          </label>
          <textarea
            id="tb-send-message"
            className="min-h-[120px] w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        {error && (
          <p id={errorId} className="text-sm text-[color:var(--color-error-text,#991B1B)]" role="alert">
            {error}
          </p>
        )}
        {hasInvalidEmail && !error && recipients.length > 0 && (
          <p className="text-xs text-[color:var(--color-error-text,#991B1B)]">形式が不正な宛先があります。</p>
        )}
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary text-sm" disabled={isSubmitting}>
            キャンセル
          </button>
          <button type="submit" className="btn-primary text-sm" disabled={isSubmitting || hasInvalidEmail} aria-describedby={error ? errorId : undefined}>
            {isSubmitting ? "送信中..." : "送信"}
          </button>
        </div>
      </form>
    </div>
  );
}
