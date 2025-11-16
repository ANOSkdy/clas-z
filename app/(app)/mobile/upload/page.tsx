"use client";

import Image from "next/image";
import type { ChangeEventHandler, DragEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ACCEPTED_MIME_PREFIXES = ["image/", "application/pdf"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 10;

type UploadStatus =
  | "ready"
  | "uploading"
  | "registering"
  | "classifying"
  | "success"
  | "error"
  | "canceled";

const STATUS_LABEL: Record<UploadStatus, string> = {
  ready: "待機中",
  uploading: "アップロード中",
  registering: "登録中",
  classifying: "分類中",
  success: "完了",
  error: "エラー",
  canceled: "キャンセル",
};

const DEFAULT_COMPANY_ID = "demo-company";
const DEFAULT_USER_ID = "demo-user";

type QueueItem = {
  id: string;
  file: File;
  previewUrl?: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  aiResult?: { label: string; confidence: number };
  aiError?: string;
  blobUrl?: string;
  documentId?: string;
  correlationId: string;
};

export default function MobileUploadPage() {
  return (
    <section className="space-y-5" aria-labelledby="mobile-upload-heading">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">uploader</p>
        <h1 id="mobile-upload-heading" className="text-xl font-semibold">
          モバイルアップロード
        </h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          カメラまたはファイルから最大10件・1件50MBまでの書類を送信できます。
        </p>
      </header>
      <Uploader />
    </section>
  );
}

function Uploader() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const controllersRef = useRef(new Map<string, AbortController>());
  const itemsRef = useRef<QueueItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const summary = useMemo(() => {
    const success = items.filter((item) => item.status === "success").length;
    const total = items.length;
    const failed = items.filter((item) => item.status === "error").length;
    return { success, total, failed };
  }, [items]);

  const updateItem = useCallback((id: string, updater: (item: QueueItem) => QueueItem) => {
    setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
  }, []);

  const appendLiveMessage = useCallback((message: string) => {
    setLiveMessage(message);
  }, []);

  const postUploadEvent = useCallback((type: string, correlationId: string, payload: Record<string, unknown>) => {
    const body = {
      type,
      source: "/mobile/upload",
      correlationId,
      payload: { ...payload, companyId: DEFAULT_COMPANY_ID },
    };
    void fetch("/api/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  }, []);

  const startProcessing = useCallback(
    (item: QueueItem) => {
      const correlationId = item.correlationId;
      const controller = new AbortController();
      controllersRef.current.set(item.id, controller);
      updateItem(item.id, (prev) => ({ ...prev, status: "uploading", progress: 1, error: undefined }));
      postUploadEvent("upload.started", correlationId, {
        fileName: item.file.name,
        size: item.file.size,
      });
      appendLiveMessage(`${item.file.name} のアップロードを開始しました。`);

      const uploadWithProgress = (uploadUrl: string) =>
        new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);
          xhr.responseType = "text";
          xhr.setRequestHeader("content-type", item.file.type || "application/octet-stream");
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              updateItem(item.id, (prev) => ({ ...prev, progress: percent }));
            }
          };
          xhr.onerror = () => reject(new Error("ネットワークエラーが発生しました"));
          xhr.onabort = () => reject(new DOMException("aborted", "AbortError"));
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              updateItem(item.id, (prev) => ({ ...prev, progress: 100 }));
              resolve();
            } else {
              reject(new Error(`アップロードに失敗しました (${xhr.status})`));
            }
          };
          controller.signal.addEventListener(
            "abort",
            () => {
              xhr.abort();
            },
            { once: true },
          );
          xhr.send(item.file);
        });

      const run = async () => {
        try {
          const createRes = await fetch("/api/upload/create-url", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-correlation-id": correlationId,
            },
            body: JSON.stringify({
              contentType: item.file.type || "application/octet-stream",
              size: item.file.size,
            }),
            signal: controller.signal,
          });
          if (!createRes.ok) {
            const errorPayload = await createRes.json().catch(() => ({}));
            throw new Error(errorPayload?.error?.message ?? "署名URLの取得に失敗しました");
          }
          const { uploadUrl, blobUrl } = await createRes.json();

          await uploadWithProgress(uploadUrl);
          appendLiveMessage(`${item.file.name} をクラウドに保存しました。`);

          updateItem(item.id, (prev) => ({ ...prev, status: "registering", blobUrl }));
          const documentRes = await fetch("/api/documents", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-correlation-id": correlationId,
            },
            body: JSON.stringify({
              companyId: DEFAULT_COMPANY_ID,
              uploaderUserId: DEFAULT_USER_ID,
              blobUrl,
              meta: {
                name: item.file.name,
                size: item.file.size,
                type: item.file.type,
              },
            }),
            signal: controller.signal,
          });
          if (!documentRes.ok) {
            const errorPayload = await documentRes.json().catch(() => ({}));
            throw new Error(errorPayload?.error?.message ?? "ドキュメント登録に失敗しました");
          }
          const { documentId } = await documentRes.json();
          updateItem(item.id, (prev) => ({ ...prev, documentId }));

          updateItem(item.id, (prev) => ({ ...prev, status: "classifying" }));
          try {
            const classifyRes = await fetch("/api/ai/classify", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-correlation-id": correlationId,
              },
              body: JSON.stringify({ documentId, blobUrl }),
              signal: controller.signal,
            });
            if (classifyRes.ok) {
              const { aiLabel, confidence } = await classifyRes.json();
              updateItem(item.id, (prev) => ({
                ...prev,
                aiResult: { label: aiLabel, confidence },
                status: "success",
                progress: 100,
              }));
              appendLiveMessage(`${item.file.name} の分類が完了しました。`);
            } else {
              const errorPayload = await classifyRes.json().catch(() => ({}));
              updateItem(item.id, (prev) => ({
                ...prev,
                status: "success",
                aiError: errorPayload?.error?.message ?? "分類に失敗しました",
              }));
            }
          } catch (classifyError) {
            if (controller.signal.aborted) throw classifyError;
            updateItem(item.id, (prev) => ({
              ...prev,
              status: "success",
              aiError:
                classifyError instanceof Error
                  ? classifyError.message
                  : "分類に失敗しました",
            }));
          }

          postUploadEvent("upload.completed", correlationId, {
            documentId,
            fileName: item.file.name,
            size: item.file.size,
          });
        } catch (error: unknown) {
          if (controller.signal.aborted) {
            updateItem(item.id, (prev) => ({ ...prev, status: "canceled", error: "アップロードをキャンセルしました" }));
            appendLiveMessage(`${item.file.name} をキャンセルしました。`);
            return;
          }
          updateItem(item.id, (prev) => ({
            ...prev,
            status: "error",
            error: error instanceof Error ? error.message : "不明なエラーが発生しました",
          }));
          postUploadEvent("upload.failed", correlationId, {
            fileName: item.file.name,
            size: item.file.size,
            error: error instanceof Error ? error.message : "unknown",
          });
          appendLiveMessage(`${item.file.name} でエラーが発生しました。`);
        } finally {
          controllersRef.current.delete(item.id);
        }
      };

      void run();
    },
    [appendLiveMessage, updateItem],
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;
      setSelectionError(null);

      const currentActive = itemsRef.current.filter(
        (item) => item.status !== "canceled" && item.status !== "success",
      ).length;
      const availableSlots = Math.max(0, MAX_FILES - currentActive);
      const files = Array.from(fileList);
      const newItems: QueueItem[] = [];
      const errors: string[] = [];

      for (const file of files) {
        if (newItems.length >= availableSlots) {
          errors.push(`最大${MAX_FILES}件まで選択できます。`);
          break;
        }

        const isAccepted = ACCEPTED_MIME_PREFIXES.some((prefix) =>
          prefix.endsWith("/") ? file.type.startsWith(prefix) : file.type === prefix,
        );
        if (!isAccepted) {
          errors.push(`${file.name}: 対応形式は画像またはPDFです。`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: 50MB以下にしてください。`);
          continue;
        }

        const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
        const correlationId = crypto.randomUUID();
        postUploadEvent("upload.requested", correlationId, {
          fileName: file.name,
          size: file.size,
        });
        newItems.push({
          id: crypto.randomUUID(),
          file,
          previewUrl,
          status: "ready",
          progress: 0,
          correlationId,
        });
      }

      if (errors.length) {
        setSelectionError(errors.join("\n"));
      }
      if (!newItems.length) return;

      setItems((prev) => [...newItems, ...prev]);
      newItems.forEach((item) => {
        queueMicrotask(() => {
          startProcessing(item);
        });
      });
    },
    [startProcessing],
  );

  const cancelItem = useCallback((id: string) => {
    const controller = controllersRef.current.get(id);
    if (controller) {
      controller.abort();
    } else {
      updateItem(id, (prev) => ({ ...prev, status: "canceled", error: "キャンセルしました" }));
    }
  }, [updateItem]);

  const retryItem = useCallback(
    (item: QueueItem) => {
      updateItem(item.id, (prev) => ({
        ...prev,
        status: "ready",
        progress: 0,
        error: undefined,
        aiResult: undefined,
        aiError: undefined,
      }));
      queueMicrotask(() => startProcessing(item));
    },
    [startProcessing, updateItem],
  );

  const onInputChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      handleFiles(event.currentTarget.files);
      event.currentTarget.value = "";
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLLabelElement | HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLLabelElement | HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLLabelElement | HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      handleFiles(event.dataTransfer?.files ?? null);
    },
    [handleFiles],
  );

  return (
    <div className="space-y-4">
      <div className="card space-y-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[color:var(--color-text-muted)]">合計 {summary.total} 件</p>
            <p className="text-lg font-semibold text-[color:var(--color-primary-plum-800)]">
              完了 {summary.success} 件 / 失敗 {summary.failed} 件
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary text-sm"
            onClick={() => document.getElementById("mobile-uploader-input")?.click()}
          >
            ライブラリを開く
          </button>
        </div>
        <div
          className={`rounded-2xl border border-dashed ${dragActive ? "border-[color:var(--color-primary-plum-800)] bg-[rgba(171,121,171,0.08)]" : "border-[color:var(--color-border)]"}`}
        >
          <label
            htmlFor="mobile-uploader-input"
            className="flex flex-col items-center justify-center gap-3 p-6 text-center"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <span className="text-base font-semibold">タップで撮影 / ファイル選択</span>
            <span className="text-sm text-[color:var(--color-text-muted)]">
              画像・PDF（1件50MBまで）を最大10件アップロードできます。ドラッグ＆ドロップも可能です。
            </span>
            <input
              id="mobile-uploader-input"
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              multiple
              className="sr-only"
              onChange={onInputChange}
            />
            <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-surface-muted)] px-4 py-2 text-xs text-[color:var(--color-text-muted)]">
              カメラ / ライブラリ / ファイル
            </span>
          </label>
        </div>
        {selectionError && (
          <p role="alert" className="rounded-lg bg-[rgba(192,86,33,0.1)] p-3 text-sm text-[color:var(--color-warning)]">
            {selectionError.split("\n").map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        )}
        <p className="text-xs text-[color:var(--color-text-muted)]">
          進行中のアイテムはいつでもキャンセルできます。キャンセル後はリトライで再開します。
        </p>
      </div>

      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      <section className="space-y-3" aria-label="アップロードキュー">
        {items.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-muted)]">まだファイルがありません。先にファイルを追加してください。</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="card space-y-3"
                aria-live="polite"
                aria-label={`${item.file.name} ${STATUS_LABEL[item.status]}`}
              >
                <div className="flex items-center gap-3">
                  <Preview item={item} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-semibold">{item.file.name}</p>
                    <p className="text-xs text-[color:var(--color-text-muted)]">{formatBytes(item.file.size)}</p>
                    <p className="text-xs font-medium text-[color:var(--color-primary-plum-800)]">
                      {STATUS_LABEL[item.status]}
                    </p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[color:var(--color-surface-muted)]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress}>
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.status === "success"
                        ? "bg-[color:var(--color-success)]"
                        : item.status === "error"
                          ? "bg-[color:var(--color-warning)]"
                          : "bg-[color:var(--color-primary-plum-700)]"
                    }`}
                    style={{ width: `${Math.max(item.progress, item.status === "success" ? 100 : 0)}%` }}
                  />
                </div>
                {item.error && (
                  <p role="alert" className="rounded-lg bg-[rgba(192,86,33,0.12)] p-2 text-xs text-[color:var(--color-warning)]">
                    {item.error}
                  </p>
                )}
                {item.aiResult && (
                  <div className="rounded-lg bg-[rgba(27,156,115,0.08)] p-2 text-xs">
                    AIラベル: <span className="font-semibold">{item.aiResult.label}</span>（信頼度 {(item.aiResult.confidence * 100).toFixed(1)}%）
                  </div>
                )}
                {item.aiError && !item.aiResult && (
                  <p className="text-xs text-[color:var(--color-text-muted)]">AI分類に失敗: {item.aiError}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {item.status === "error" && (
                    <button
                      type="button"
                      className="btn btn-primary flex-1 text-sm"
                      onClick={() => retryItem(item)}
                    >
                      リトライ
                    </button>
                  )}
                  {item.status !== "success" && item.status !== "canceled" && (
                    <button
                      type="button"
                      className="btn btn-secondary flex-1 text-sm"
                      onClick={() => cancelItem(item.id)}
                    >
                      キャンセル
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Preview({ item }: { item: QueueItem }) {
  if (item.previewUrl) {
    return (
      <Image
        src={item.previewUrl}
        alt={`${item.file.name} プレビュー`}
        width={64}
        height={64}
        className="h-16 w-16 flex-none rounded-lg object-cover"
        unoptimized
      />
    );
  }
  return (
    <div className="flex h-16 w-16 flex-none items-center justify-center rounded-lg bg-[color:var(--color-surface-muted)] text-[color:var(--color-primary-plum-800)]">
      PDF
    </div>
  );
}

function formatBytes(size: number) {
  if (size === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
  const value = size / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
