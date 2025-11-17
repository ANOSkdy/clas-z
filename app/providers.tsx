"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useAnnounce } from "./(app)/providers/A11yProvider";

type UndoToastState = {
  companyName: string;
  status: "idle" | "restoring" | "restored" | "error";
  error?: string;
};

const EVENT_NAME = "clas:softDelete";

const makeCorrelationId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <UndoToastHost />
      {children}
    </QueryClientProvider>
  );
}

function UndoToastHost() {
  const [toast, setToast] = useState<UndoToastState | null>(null);
  const announce = useAnnounce();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ entity: string; companyName: string }>).detail;
      if (!detail || detail.entity !== "company") return;
      setToast({ companyName: detail.companyName, status: "idle" });
      announce(`会社「${detail.companyName}」を論理削除しました。`);
    };
    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, [announce]);

  const dismiss = useCallback(() => setToast(null), []);

  const handleRestore = useCallback(async () => {
    setToast((prev) => (prev ? { ...prev, status: "restoring", error: undefined } : prev));
    try {
      const response = await fetch("/api/settings/company/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": makeCorrelationId(),
        },
        body: JSON.stringify({}),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = json?.error?.message ?? "復元に失敗しました";
        throw new Error(message);
      }
      setToast((prev) => (prev ? { ...prev, status: "restored", error: undefined } : prev));
      announce("復元が完了しました");
      setTimeout(() => setToast(null), 5000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "復元に失敗しました";
      setToast((prev) => (prev ? { ...prev, status: "error", error: message } : prev));
      announce(message);
    }
  }, [announce]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4">
      <div
        role="alert"
        aria-live="assertive"
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-xl"
      >
        <p className="text-sm font-semibold">会社「{toast.companyName}」を論理削除しました。</p>
        {toast.status === "restored" ? (
          <p className="text-sm text-[color:var(--color-text-muted)]">復元が完了しました。</p>
        ) : (
          <p className="text-sm text-[color:var(--color-text-muted)]">復元を押すと即座にアクセスを再開できます。</p>
        )}
        {toast.status === "error" && toast.error && (
          <p className="mt-2 text-sm text-[color:var(--color-error-text,#991B1B)]">{toast.error}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {toast.status !== "restored" && (
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={handleRestore}
              disabled={toast.status === "restoring"}
            >
              {toast.status === "restoring" ? "復元中..." : "復元"}
            </button>
          )}
          <button type="button" className="btn-secondary text-sm" onClick={dismiss}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
