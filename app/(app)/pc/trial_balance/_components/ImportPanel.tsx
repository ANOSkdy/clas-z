"use client";

import { ChangeEvent, useMemo, useState } from "react";

import { TBLine } from "@/lib/schemas/tb";

export type ImportStats = {
  count: number;
  debitTotal: number;
  creditTotal: number;
  balanced: boolean;
};

type ImportPanelProps = {
  meta: { periodStart?: string; periodEnd?: string; currency: string };
  onMetaChange: (meta: { periodStart?: string; periodEnd?: string; currency: string }) => void;
  onLinesParsed: (payload: { lines: TBLine[]; stats: ImportStats; source: "csv" | "pdf" }) => void;
  onCreateTB: (payload: {
    lines: TBLine[];
    stats?: ImportStats | null;
    source: "csv" | "pdf";
  }) => Promise<void>;
  isCreating: boolean;
  disabled?: boolean;
};

export function ImportPanel({ meta, onMetaChange, onLinesParsed, onCreateTB, isCreating, disabled }: ImportPanelProps) {
  const [activeTab, setActiveTab] = useState<"csv" | "pdf">("csv");
  const [csvText, setCsvText] = useState("");
  const [pdfBlobUrl, setPdfBlobUrl] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLines, setPreviewLines] = useState<TBLine[]>([]);
  const [previewStats, setPreviewStats] = useState<ImportStats | null>(null);
  const [source, setSource] = useState<"csv" | "pdf">("csv");

  const handleCsvFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setError(null);
  };

  const handlePdfFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      setError(null);
      const uploadTicket = await fetch("/api/upload/create-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });
      if (!uploadTicket.ok) {
        throw new Error("アップロード URL の取得に失敗しました");
      }
      const { uploadUrl, blobUrl } = (await uploadTicket.json()) as { uploadUrl: string; blobUrl: string };
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error("ファイルのアップロードに失敗しました");
      }
      setPdfBlobUrl(blobUrl);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "アップロードに失敗しました";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCsvParse = async () => {
    if (!csvText.trim()) {
      setError("CSV を入力してください");
      return;
    }
    try {
      setIsParsing(true);
      setError(null);
      const response = await fetch("/api/tb/parse/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, header: true }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error?.message ?? "解析に失敗しました");
      }
      setPreviewLines(json.lines as TBLine[]);
      setPreviewStats(json.stats as ImportStats);
      setSource("csv");
      onLinesParsed({ lines: json.lines, stats: json.stats, source: "csv" });
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "解析に失敗しました";
      setError(message);
    } finally {
      setIsParsing(false);
    }
  };

  const handlePdfExtract = async () => {
    if (!pdfBlobUrl.trim()) {
      setError("PDF の Blob URL を入力してください");
      return;
    }
    try {
      setIsParsing(true);
      setError(null);
      const response = await fetch("/api/tb/extract/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl: pdfBlobUrl }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error?.message ?? "抽出に失敗しました");
      }
      setPreviewLines(json.lines as TBLine[]);
      setPreviewStats(json.stats as ImportStats);
      setSource("pdf");
      onLinesParsed({ lines: json.lines, stats: json.stats, source: "pdf" });
    } catch (extractError) {
      const message = extractError instanceof Error ? extractError.message : "抽出に失敗しました";
      setError(message);
    } finally {
      setIsParsing(false);
    }
  };

  const canCreate = previewLines.length > 0 && !isParsing && !isUploading;

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      setError(null);
      await onCreateTB({ lines: previewLines, stats: previewStats, source });
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "試算表の作成に失敗しました";
      setError(message);
    }
  };

  const summaryText = useMemo(() => {
    if (!previewStats) return "";
    return `行数 ${previewStats.count} / 借方 ${previewStats.debitTotal.toLocaleString()} / 貸方 ${previewStats.creditTotal.toLocaleString()}`;
  }, [previewStats]);

  return (
    <div className="card space-y-5" aria-labelledby="tb-import-heading">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">import</p>
          <h2 id="tb-import-heading" className="text-lg font-semibold">
            試算表の取り込み
          </h2>
        </div>
        <div className="inline-flex rounded-full border border-[color:var(--color-border)]">
          {(["csv", "pdf"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === tab
                  ? "bg-[color:var(--color-primary-plum-700)] text-white"
                  : "text-[color:var(--color-text-muted)]"
              }`}
              aria-pressed={activeTab === tab}
            >
              {tab === "csv" ? "CSV" : "PDF"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "csv" ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="tb-csv-text">
            CSV を貼り付ける
          </label>
          <textarea
            id="tb-csv-text"
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            className="h-40 w-full rounded-lg border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            placeholder="Ctrl / Cmd + V でペースト"
          />
          <div>
            <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} />
          </div>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={handleCsvParse}
            disabled={isParsing || disabled}
          >
            {isParsing ? "解析中..." : "CSV を解析"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="tb-pdf-blob">
            PDF Blob URL
          </label>
          <input
            id="tb-pdf-blob"
            type="url"
            value={pdfBlobUrl}
            onChange={(event) => setPdfBlobUrl(event.target.value)}
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            placeholder="https://..."
          />
          <div>
            <input type="file" accept="application/pdf" onChange={handlePdfFile} />
            {isUploading && <p className="text-xs text-[color:var(--color-text-muted)]">アップロード中...</p>}
          </div>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={handlePdfExtract}
            disabled={isParsing || disabled}
          >
            {isParsing ? "抽出中..." : "PDF から抽出"}
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm" htmlFor="tb-period-start">
          <span className="mb-1 block font-medium">期首</span>
          <input
            id="tb-period-start"
            type="date"
            value={meta.periodStart ?? ""}
            onChange={(event) => onMetaChange({ ...meta, periodStart: event.target.value })}
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="text-sm" htmlFor="tb-period-end">
          <span className="mb-1 block font-medium">期末</span>
          <input
            id="tb-period-end"
            type="date"
            value={meta.periodEnd ?? ""}
            onChange={(event) => onMetaChange({ ...meta, periodEnd: event.target.value })}
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="text-sm" htmlFor="tb-currency">
          <span className="mb-1 block font-medium">通貨</span>
          <select
            id="tb-currency"
            value={meta.currency}
            onChange={(event) => onMetaChange({ ...meta, currency: event.target.value })}
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
          >
            <option value="JPY">JPY</option>
            <option value="USD">USD</option>
          </select>
        </label>
      </div>

      {previewStats && (
        <div className="rounded-lg border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-3 text-sm">
          <p className="font-medium">プレビュー</p>
          <p>{summaryText}</p>
          <p className="text-xs text-[color:var(--color-text-muted)]">
            {previewStats.balanced ? "貸借一致" : "貸借が一致していません"}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-[color:var(--color-error-text,#991B1B)]" role="status">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={handleCreate}
          disabled={!canCreate || isCreating}
        >
          {isCreating ? "作成中..." : "試算表を作成"}
        </button>
      </div>
    </div>
  );
}
