"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { useQuery, useQueryClient, type InfiniteData, type QueryKey } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, type React } from "react";
import type { ReviewDetail, ReviewListItem } from "@/lib/schemas/review";

type ReviewListResponse = { items: ReviewListItem[]; nextCursor?: string | null };

type DetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  listQueryKey: QueryKey;
  summary: ReviewListItem | null;
  onMessage: (message: string) => void;
};

export default function DetailDrawer({
  open,
  onOpenChange,
  documentId,
  listQueryKey,
  summary,
  onMessage,
}: DetailDrawerProps) {
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [action, setAction] = useState<"confirm" | "reject" | null>(null);

  const { data, isLoading, error } = useQuery<ReviewDetail>({
    queryKey: ["review-detail", documentId],
    queryFn: async () => {
      if (!documentId) throw new Error("documentId is required");
      const res = await fetch(`/api/review/${documentId}`, {
        headers: { "x-correlation-id": crypto.randomUUID() },
        cache: "no-store",
      });
      const payload = (await res.json()) as ReviewDetail & { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(payload?.error?.message ?? "詳細の取得に失敗しました");
      }
      return payload;
    },
    enabled: open && Boolean(documentId),
    staleTime: 1000 * 15,
  });

  const detail = data ?? summary ?? null;

  useEffect(() => {
    setReason("");
    setReasonError("");
    setNote("");
  }, [documentId]);

  const applyOptimisticUpdate = useCallback(
    (next: Partial<ReviewListItem>) => {
      const previous = queryClient.getQueryData<InfiniteData<ReviewListResponse>>(listQueryKey);
      queryClient.setQueryData<InfiniteData<ReviewListResponse>>(listQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (item.id === documentId ? { ...item, ...next } : item)),
          })),
        };
      });
      return () => {
        queryClient.setQueryData(listQueryKey, previous);
      };
    },
    [documentId, listQueryKey, queryClient],
  );

  const closeDrawer = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setReason("");
        setReasonError("");
        setNote("");
        setAction(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  useFocusTrap(contentRef, open);

  const mutateDetailCache = useCallback(
    (update: Partial<ReviewDetail>) => {
      if (!documentId) return;
      queryClient.setQueryData<ReviewDetail>(["review-detail", documentId], (current) =>
        current ? { ...current, ...update } : current,
      );
    },
    [documentId, queryClient],
  );

  const handleConfirm = useCallback(async () => {
    if (!documentId) return;
    setAction("confirm");
    const revert = applyOptimisticUpdate({
      status: "confirmed",
      updatedAt: new Date().toISOString(),
      rejectReason: null,
    });
    const headers: HeadersInit = { "x-correlation-id": crypto.randomUUID() };
    let body: string | undefined;
    if (note.trim()) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({ note: note.trim() });
    }
    try {
      const res = await fetch(`/api/review/${documentId}/confirm`, {
        method: "POST",
        headers,
        body,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "確認に失敗しました");
      }
      mutateDetailCache({ status: "confirmed", updatedAt: new Date().toISOString(), rejectReason: null, note: note.trim() || null });
      onMessage("確認しました");
      closeDrawer(false);
    } catch (err) {
      revert();
      onMessage(err instanceof Error ? err.message : "確認に失敗しました");
    } finally {
      setAction(null);
    }
  }, [applyOptimisticUpdate, closeDrawer, documentId, mutateDetailCache, note, onMessage]);

  const handleReject = useCallback(async () => {
    if (!documentId) return;
    if (!reason.trim()) {
      setReasonError("差戻し理由を入力してください");
      return;
    }
    setAction("reject");
    setReasonError("");
    const revert = applyOptimisticUpdate({
      status: "rejected",
      updatedAt: new Date().toISOString(),
      rejectReason: reason.trim(),
    });
    try {
      const res = await fetch(`/api/review/${documentId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": crypto.randomUUID(),
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "差戻しに失敗しました");
      }
      mutateDetailCache({ status: "rejected", updatedAt: new Date().toISOString(), rejectReason: reason.trim() });
      onMessage("差戻ししました");
      closeDrawer(false);
    } catch (err) {
      revert();
      onMessage(err instanceof Error ? err.message : "差戻しに失敗しました");
    } finally {
      setAction(null);
    }
  }, [applyOptimisticUpdate, closeDrawer, documentId, mutateDetailCache, onMessage, reason]);

  const isImage = detail?.mimeType?.startsWith("image/");

  const handleKeys = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleConfirm();
      }
      if (event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        handleReject();
      }
    },
    [handleConfirm, handleReject],
  );

  return (
    <Dialog.Root open={open} onOpenChange={closeDrawer}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 data-[state=open]:animate-in" />
        <Dialog.Content
          ref={contentRef}
          className="fixed inset-y-0 right-0 w-full max-w-xl overflow-y-auto bg-[color:var(--color-surface)] p-6 shadow-xl focus:outline-none"
          onKeyDown={handleKeys}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-drawer-title"
          aria-describedby="detail-drawer-description"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title id="detail-drawer-title" className="text-lg font-semibold">
                {detail?.fileName ?? "ドキュメント詳細"}
              </Dialog.Title>
              <Dialog.Description id="detail-drawer-description" className="text-sm text-[color:var(--color-text-muted)]">
                {detail?.mimeType ?? "種類不明"} ・ {detail?.size ? formatBytes(detail.size) : "サイズ不明"}
              </Dialog.Description>
            </div>
            <Dialog.Close className="btn-secondary">閉じる</Dialog.Close>
          </div>
          <section className="mt-6 space-y-4">
            {detail ? (
              <>
                <div className="rounded border border-[color:var(--color-border)] p-3">
                  {isImage && detail.blobUrl ? (
                    <Image
                      src={detail.blobUrl}
                      alt={`${detail.fileName} のプレビュー`}
                      width={800}
                      height={600}
                      className="max-h-64 w-full rounded object-contain"
                    />
                  ) : (
                    <div className="space-y-2 text-sm">
                      <p>プレビューはこの形式に対応していません。</p>
                      {detail.blobUrl && (
                        <a
                          href={detail.blobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[color:var(--color-primary-plum-800)] underline-offset-4 hover:underline"
                        >
                          ダウンロード
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <dl className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-[color:var(--color-text-muted)]">作成日時</dt>
                    <dd>{formatDate(detail.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--color-text-muted)]">ステータス</dt>
                    <dd>{detail.status}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--color-text-muted)]">AI ラベル</dt>
                    <dd>{detail.aiLabel ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--color-text-muted)]">会社</dt>
                    <dd>{detail.companyName ?? detail.companyId ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--color-text-muted)]">アップローダー</dt>
                    <dd>{detail.uploaderUserId ?? "-"}</dd>
                  </div>
                </dl>
                {detail.rejectReason && (
                  <p className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    差戻し理由: {detail.rejectReason}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-[color:var(--color-text-muted)]">
                {isLoading ? "読み込み中" : error instanceof Error ? error.message : "ドキュメントが選択されていません"}
              </p>
            )}
          </section>
          <section className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-[color:var(--color-text-muted)]">
              確認メモ (Cmd/Ctrl + Enter で確定)
              <textarea
                className="mt-1 w-full rounded border border-[color:var(--color-border)] bg-transparent p-2"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="AI ラベルの補足など"
              />
            </label>
            <label className="block text-sm font-medium text-[color:var(--color-text-muted)]">
              差戻し理由 (Shift + Enter で送信)
              <textarea
                className="mt-1 w-full rounded border border-[color:var(--color-border)] bg-transparent p-2"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="不足している情報や確認点"
                aria-invalid={Boolean(reasonError)}
                aria-errormessage={reasonError ? "detail-drawer-reason-error" : undefined}
              />
              {reasonError && (
                <span id="detail-drawer-reason-error" className="text-sm text-rose-600">
                  {reasonError}
                </span>
              )}
            </label>
          </section>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!detail || action === "confirm"}
              className="btn-primary"
            >
              {action === "confirm" ? "確認中..." : "確認する"}
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={!detail || action === "reject"}
              className="btn-secondary"
            >
              {action === "reject" ? "差戻し中..." : "差戻し"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatBytes(value: number) {
  if (!value) return "0B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** exponent).toFixed(1)}${units[exponent]}`;
}

function useFocusTrap(containerRef: React.RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      ),
    );
    focusable[0]?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    container.addEventListener("keydown", handleKeydown);
    return () => container.removeEventListener("keydown", handleKeydown);
  }, [active, containerRef]);
}
