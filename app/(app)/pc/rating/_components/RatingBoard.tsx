"use client";

import { useCallback, useMemo, useState } from "react";

import type { CompanyRating, DocumentRating } from "@/lib/schemas/rating";

type ExtendedDocumentRating = DocumentRating & {
  fileName?: string;
  status?: string;
  aiLabel?: string;
  updatedAt?: string;
};

type EventItem = {
  id: string;
  type: string;
  source: string;
  createdAt: string;
  correlationId?: string;
  payload?: Record<string, unknown>;
};

type RatingBoardProps = {
  initialCompany: CompanyRating | null;
  initialDocuments: ExtendedDocumentRating[];
  companyId: string | null;
};

type SortKey = "score" | "updatedAt";
type SortDirection = "asc" | "desc";

export default function RatingBoard({ initialCompany, initialDocuments, companyId }: RatingBoardProps) {
  const [company, setCompany] = useState(initialCompany);
  const [documents, setDocuments] = useState(initialDocuments);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedDocId, setSelectedDocId] = useState(initialDocuments[0]?.documentId ?? null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);

  const sortedDocuments = useMemo(() => {
    const sorted = [...documents];
    sorted.sort((a, b) => {
      if (sortKey === "score") {
        return sortDirection === "asc" ? a.score - b.score : b.score - a.score;
      }
      const aTime = new Date(a.updatedAt ?? a.computedAt).getTime();
      const bTime = new Date(b.updatedAt ?? b.computedAt).getTime();
      return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    });
    return sorted;
  }, [documents, sortDirection, sortKey]);

  const selectedDocument = sortedDocuments.find((doc) => doc.documentId === selectedDocId) ?? sortedDocuments[0];

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSortDirection("desc");
      return key;
    });
  }, []);

  const broadcastEvents = useCallback((events?: EventItem[]) => {
    if (typeof window === "undefined" || !events) return;
    window.dispatchEvent(new CustomEvent("rating:events", { detail: events }));
  }, []);

  const fetchLatest = useCallback(async () => {
    if (!companyId) return;
    const correlationId = crypto.randomUUID();
    const response = await fetch(`/api/rating?company=${companyId}`, {
      headers: { "x-correlation-id": correlationId },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("スコアの更新に失敗しました");
    }
    const data = await response.json();
    setCompany(data.company ?? null);
    setDocuments(Array.isArray(data.documents) ? data.documents : []);
    setSelectedDocId((current) => current ?? data.documents?.[0]?.documentId ?? null);
    broadcastEvents(data.events);
  }, [companyId]);

  const handleRefresh = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      await fetchLatest();
      setToast("最新スコアを取得しました");
    } catch (error) {
      console.error(error);
      setToast("更新に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [companyId, fetchLatest, broadcastEvents]);

  const handleRecompute = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const correlationId = crypto.randomUUID();
      const response = await fetch("/api/rating/compute", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-correlation-id": correlationId,
        },
        body: JSON.stringify({ scope: "company", companyId, reason: "ui.recompute" }),
      });
      if (!response.ok) {
        throw new Error("再計算に失敗しました");
      }
      await fetchLatest();
      setToast("再計算しました");
    } catch (error) {
      console.error(error);
      setToast("再計算に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [companyId, fetchLatest]);

  return (
    <section className="card space-y-6" aria-label="レーティングボード">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">company score</p>
          <p className="text-4xl font-semibold text-[color:var(--color-primary-plum-900)]">
            {company?.score?.toFixed(1) ?? "--"}
          </p>
          <p className="text-sm text-[color:var(--color-text-muted)]">Level {company?.level ?? "-"}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className="btn-secondary inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm"
            disabled={loading || !companyId}
          >
            最新を取得
          </button>
          <button
            type="button"
            onClick={handleRecompute}
            className="btn-primary inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm"
            disabled={loading || !companyId}
          >
            再計算
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm" role="grid" aria-label="ドキュメントスコア">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
              <th className="py-2 pr-3 font-medium">ファイル</th>
              <th className="py-2 pr-3 font-medium">AI ラベル</th>
              <th className="py-2 pr-3 font-medium">ステータス</th>
              <th className="py-2 pr-3 font-medium">
                <button type="button" onClick={() => handleSort("score")} className="inline-flex items-center gap-1">
                  スコア
                  <SortIcon active={sortKey === "score"} direction={sortDirection} />
                </button>
              </th>
              <th className="py-2 pr-3 font-medium">レベル</th>
              <th className="py-2 pr-3 font-medium">
                <button type="button" onClick={() => handleSort("updatedAt")} className="inline-flex items-center gap-1">
                  更新
                  <SortIcon active={sortKey === "updatedAt"} direction={sortDirection} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedDocuments.map((doc) => (
              <tr
                key={doc.documentId}
                className={`cursor-pointer border-t border-[color:var(--color-border)] transition hover:bg-[color:var(--color-surface-muted)] ${
                  selectedDocId === doc.documentId ? "bg-[rgba(171,121,171,0.08)]" : ""
                }`}
                tabIndex={0}
                onClick={() => setSelectedDocId(doc.documentId)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedDocId(doc.documentId);
                  }
                }}
              >
                <td className="py-2 pr-3 font-medium">{doc.fileName ?? doc.documentId}</td>
                <td className="py-2 pr-3">{doc.aiLabel ?? "-"}</td>
                <td className="py-2 pr-3">{doc.status ?? "-"}</td>
                <td className="py-2 pr-3 font-semibold">{doc.score.toFixed(1)}</td>
                <td className="py-2 pr-3">{doc.level}</td>
                <td className="py-2 pr-3 text-xs text-[color:var(--color-text-muted)]">
                  {new Date(doc.updatedAt ?? doc.computedAt).toLocaleString("ja-JP")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDocument && (
        <div className="rounded-2xl bg-[color:var(--color-surface-muted)] p-4" aria-live="polite">
          <p className="text-sm font-semibold">スコア内訳 ({selectedDocument.fileName ?? selectedDocument.documentId})</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[color:var(--color-text-muted)]">信頼度</dt>
              <dd className="font-semibold">{selectedDocument.breakdown.confidence.toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--color-text-muted)]">ステータス加点</dt>
              <dd className="font-semibold">{selectedDocument.breakdown.statusBonus.toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--color-text-muted)]">メタデータ</dt>
              <dd className="font-semibold">{selectedDocument.breakdown.metaCompleteness.toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--color-text-muted)]">スピード</dt>
              <dd className="font-semibold">{selectedDocument.breakdown.speedBonus.toFixed(1)}</dd>
            </div>
          </dl>
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {toast}
      </div>
    </section>
  );
}

type SortIconProps = { active: boolean; direction: SortDirection };

function SortIcon({ active, direction }: SortIconProps) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-4 w-4 items-center justify-center rounded ${
        active ? "text-[color:var(--color-primary-plum-800)]" : "text-[color:var(--color-text-muted)]"
      }`}
    >
      {direction === "asc" ? "▲" : "▼"}
    </span>
  );
}
