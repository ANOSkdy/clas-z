"use client";

import { useCallback, useMemo, useState } from "react";
import type { TBLine } from "@/lib/schemas/tb";
import type { TBStats } from "@/lib/tb";

const previewColumns: Array<keyof TBLine> = ["accountCode", "accountName", "debit", "credit", "note"];

type ImportPanelProps = {
  onImport: (lines: TBLine[], stats: TBStats, source: "csv" | "pdf") => void;
  stats: TBStats | null;
};

export default function ImportPanel({ onImport, stats }: ImportPanelProps) {
  const [tab, setTab] = useState<"csv" | "pdf">("csv");
  const [csvText, setCsvText] = useState("code,account,debit,credit\n100,現金,1000,0");
  const [pdfUrl, setPdfUrl] = useState("");
  const [preview, setPreview] = useState<TBLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const handleCsvFile = useCallback((file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const request = async (url: string, body: unknown) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message ?? "API エラー");
    }
    return response.json();
  };

  const handleCsvParse = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = (await request("/api/tb/parse/csv", { csv: csvText })) as {
        lines: TBLine[];
        stats: TBStats;
      };
      setPreview(data.lines.slice(0, 5));
      onImport(data.lines, data.stats, "csv");
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV の解析に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const handlePdfExtract = async () => {
    if (!pdfUrl) {
      setError("PDF の Blob URL を入力してください");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = (await request("/api/tb/extract/pdf", { blobUrl: pdfUrl })) as {
        lines: TBLine[];
        stats: TBStats;
      };
      setPreview(data.lines.slice(0, 5));
      onImport(data.lines, data.stats, "pdf");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF の解析に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const handlePdfFile = async (file: File | null) => {
    if (!file) return;
    setUploadMessage("アップロード URL を生成中...");
    try {
      const uploadMeta = await request("/api/upload/create-url", {
        contentType: file.type,
        size: file.size,
      });
      const uploadResponse = await fetch(uploadMeta.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error("アップロードに失敗しました");
      }
      setPdfUrl(uploadMeta.blobUrl);
      setUploadMessage("アップロード完了。Blob URL を使用します");
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
      setUploadMessage(null);
    }
  };

  const statsLabel = useMemo(() => {
    if (!stats) return "-";
    return `${stats.count} 行 / 借方 ${stats.debitTotal.toLocaleString()} / 貸方 ${stats.creditTotal.toLocaleString()}`;
  }, [stats]);

  return (
    <div className="card space-y-4" aria-live="polite">
      <div className="flex flex-wrap gap-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "csv"}
          className={`chip ${tab === "csv" ? "chip-active" : ""}`}
          onClick={() => setTab("csv")}
        >
          CSV 取り込み
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pdf"}
          className={`chip ${tab === "pdf" ? "chip-active" : ""}`}
          onClick={() => setTab("pdf")}
        >
          PDF + AI
        </button>
      </div>
      {tab === "csv" ? (
        <div className="space-y-3">
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--color-text-muted)]">CSV を貼り付け</span>
            <textarea
              className="input h-32"
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              placeholder="科目コード,勘定科目,..."
            />
          </label>
          <label className="flex flex-col text-sm gap-1">
            <span className="text-[color:var(--color-text-muted)]">またはファイルを選択</span>
            <input type="file" accept=".csv,text/csv" onChange={(event) => handleCsvFile(event.target.files?.[0] ?? null)} />
          </label>
          <button type="button" className="btn-secondary" onClick={handleCsvParse} disabled={busy}>
            {busy ? "解析中..." : "CSV を解析"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--color-text-muted)]">PDF Blob URL</span>
            <input
              type="url"
              className="input"
              value={pdfUrl}
              onChange={(event) => setPdfUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="flex flex-col text-sm gap-1">
            <span className="text-[color:var(--color-text-muted)]">または PDF をアップロード</span>
            <input type="file" accept="application/pdf" onChange={(event) => handlePdfFile(event.target.files?.[0] ?? null)} />
          </label>
          {uploadMessage ? <p className="text-xs text-green-700">{uploadMessage}</p> : null}
          <button type="button" className="btn-secondary" onClick={handlePdfExtract} disabled={busy}>
            {busy ? "抽出中..." : "AI で抽出"}
          </button>
        </div>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-3 text-sm">
        <p className="font-medium">最新の解析結果</p>
        <p className="text-[color:var(--color-text-muted)]">{statsLabel}</p>
        {preview.length ? (
          <table className="mt-3 w-full text-left text-xs">
            <thead>
              <tr>
                {previewColumns.map((key) => (
                  <th key={key} className="pb-1 pr-4 font-semibold">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((line, index) => (
                <tr key={`${line.accountCode}-${index}`} className="border-t border-[color:var(--color-border)]">
                  {previewColumns.map((key) => (
                    <td key={key} className="py-1 pr-4">
                      {line[key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}
