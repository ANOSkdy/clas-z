"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryFunctionContext,
  type QueryKey,
} from "@tanstack/react-query";
import DetailDrawer from "./DetailDrawer";
import type { ReviewListItem } from "@/lib/schemas/review";

const PAGE_SIZE = 50;

type ReviewListResponse = {
  items: ReviewListItem[];
  nextCursor?: string | null;
};

type ReviewGridProps = {
  initialItems: ReviewListItem[];
  initialCursor?: string;
  query: {
    q?: string;
    status?: string;
    companyId?: string;
    sort?: string;
    order?: string;
  };
  initialSelectedId?: string;
};

type SortKey = "createdAt" | "aiLabel" | "status";

const STATUS_LABEL: Record<string, string> = {
  pending: "未確認",
  confirmed: "確定",
  rejected: "差戻し",
};

export default function ReviewGrid({
  initialItems,
  initialCursor,
  query,
  initialSelectedId,
}: ReviewGridProps) {
  const normalizedQuery = useMemo(
    () => ({
      q: query.q ?? "",
      status: query.status ?? "pending",
      companyId: query.companyId ?? "",
      sort: (query.sort as SortKey) ?? "createdAt",
      order: query.order === "asc" ? "asc" : "desc",
      limit: PAGE_SIZE,
    }),
    [query],
  );
  const listQueryKey = useMemo(() => ["review-list", normalizedQuery] as QueryKey, [normalizedQuery]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialSelectedId));
  const [toast, setToast] = useState<string>("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const paramsSnapshot = searchParams.toString();
  const loadMoreRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setSelectedId(initialSelectedId ?? null);
    setDrawerOpen(Boolean(initialSelectedId));
  }, [initialSelectedId]);

  const initialData = useMemo<InfiniteData<ReviewListResponse, string | null> | undefined>(() => {
    return {
      pages: [
        {
          items: initialItems,
          nextCursor: initialCursor ?? null,
        },
      ],
      pageParams: [null],
    };
  }, [initialItems, initialCursor]);

  const fetchPage = useCallback(
    async ({ pageParam }: QueryFunctionContext<QueryKey, string | null | undefined>) => {
      const params = new URLSearchParams();
      if (normalizedQuery.q) params.set("q", normalizedQuery.q);
      if (normalizedQuery.status) params.set("status", normalizedQuery.status);
      if (normalizedQuery.companyId) params.set("companyId", normalizedQuery.companyId);
      params.set("sort", normalizedQuery.sort);
      params.set("order", normalizedQuery.order);
      params.set("limit", String(PAGE_SIZE));
      const cursor = typeof pageParam === "string" ? pageParam : null;
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/review?${params.toString()}`, {
        headers: { "x-correlation-id": crypto.randomUUID() },
        cache: "no-store",
      });
      const body = (await res.json()) as ReviewListResponse & { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(body?.error?.message ?? "一覧取得に失敗しました");
      }
      return body;
    },
    [normalizedQuery],
  );

  const queryResult = useInfiniteQuery<
    ReviewListResponse,
    Error,
    InfiniteData<ReviewListResponse>,
    QueryKey,
    string | null
  >({
    queryKey: listQueryKey,
    initialData,
    queryFn: fetchPage,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 5,
    refetchOnMount: false,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, error, isPending } = queryResult;

  const flatItems = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  useEffect(() => {
    if (!hasNextPage || !loadMoreRef.current) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const updateUrlSelection = useCallback(
    (nextId: string | null) => {
      const params = new URLSearchParams(paramsSnapshot);
      if (nextId) {
        params.set("id", nextId);
      } else {
        params.delete("id");
      }
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [paramsSnapshot, pathname, router],
  );

  const selectRow = useCallback(
    (id: string) => {
      setSelectedId(id);
      setDrawerOpen(true);
      updateUrlSelection(id);
    },
    [updateUrlSelection],
  );

  const handleRowKey = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!flatItems.length) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter") return;
      event.preventDefault();
      const currentIndex = flatItems.findIndex((item) => item.id === selectedId);
      if (event.key === "Enter" && selectedId) {
        setDrawerOpen(true);
        updateUrlSelection(selectedId);
        return;
      }
      let nextIndex = currentIndex;
      if (event.key === "ArrowDown") {
        nextIndex = currentIndex < flatItems.length - 1 ? currentIndex + 1 : 0;
      }
      if (event.key === "ArrowUp") {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : flatItems.length - 1;
      }
      const nextItem = flatItems[nextIndex >= 0 ? nextIndex : 0];
      if (nextItem) {
        setSelectedId(nextItem.id);
        setDrawerOpen(true);
        updateUrlSelection(nextItem.id);
      }
    },
    [flatItems, selectedId, updateUrlSelection],
  );

  const handleSort = useCallback(
    (key: SortKey) => {
      const nextOrder = normalizedQuery.sort === key && normalizedQuery.order === "asc" ? "desc" : "asc";
      const params = new URLSearchParams(paramsSnapshot);
      params.set("sort", key);
      params.set("order", nextOrder);
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [normalizedQuery.order, normalizedQuery.sort, paramsSnapshot, pathname, router],
  );

  const selectedItem = useMemo(
    () => flatItems.find((item) => item.id === selectedId) ?? null,
    [flatItems, selectedId],
  );

  const statusMessage = useMemo(() => {
    if (isPending) return "読込中";
    if (error instanceof Error) return error.message;
    return "";
  }, [error, isPending]);

  const gridRows = flatItems.length ? (
    flatItems.map((item) => (
      <tr
        key={item.id}
        className={cx(
          "border-b border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-muted)]",
          selectedId === item.id && "bg-[color:var(--color-primary-plum-500)]/10",
        )}
        onClick={() => selectRow(item.id)}
        tabIndex={0}
        aria-selected={selectedId === item.id}
      >
        <td className="p-3 text-sm text-[color:var(--color-text-muted)]">
          {formatDate(item.createdAt)}
        </td>
        <td className="p-3">
          <p className="font-medium text-sm">{item.fileName}</p>
          <p className="text-xs text-[color:var(--color-text-muted)]">{item.mimeType ?? "-"}</p>
        </td>
        <td className="p-3 text-sm">{item.aiLabel ?? "-"}</td>
        <td className="p-3 text-sm">
          <span
            className={cx(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize",
              pillClass(item.status),
            )}
          >
            {STATUS_LABEL[item.status] ?? item.status}
          </span>
        </td>
        <td className="p-3 text-sm">{item.companyName ?? item.companyId ?? "-"}</td>
        <td className="p-3 text-sm">{item.uploaderUserId ?? "-"}</td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={6} className="p-6 text-center text-sm text-[color:var(--color-text-muted)]">
        {status === "pending" ? "読み込み中..." : "対象のドキュメントがありません"}
      </td>
    </tr>
  );

  return (
    <div className="card space-y-4" onKeyDown={handleRowKey} tabIndex={0} aria-label="ドキュメントグリッド">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[color:var(--color-text-muted)]">
          {flatItems.length} 件 / ソート: {sortLabel(normalizedQuery.sort)} ({normalizedQuery.order})
        </div>
        {statusMessage && <p className="text-sm text-[color:var(--color-text-muted)]">{statusMessage}</p>}
      </header>
      <div className="overflow-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="sticky top-0 bg-[color:var(--color-surface)] text-left text-xs uppercase tracking-widest text-[color:var(--color-text-muted)]">
            <tr>
              <th className="p-3">
                <SortButton label="作成日" active={normalizedQuery.sort === "createdAt"} order={normalizedQuery.order} onClick={() => handleSort("createdAt")} />
              </th>
              <th className="p-3">ファイル</th>
              <th className="p-3">
                <SortButton label="AI ラベル" active={normalizedQuery.sort === "aiLabel"} order={normalizedQuery.order} onClick={() => handleSort("aiLabel")} />
              </th>
              <th className="p-3">
                <SortButton label="ステータス" active={normalizedQuery.sort === "status"} order={normalizedQuery.order} onClick={() => handleSort("status")} />
              </th>
              <th className="p-3">会社</th>
              <th className="p-3">アップローダー</th>
            </tr>
          </thead>
          <tbody>{gridRows}</tbody>
        </table>
      </div>
      {hasNextPage && (
        <button
          ref={loadMoreRef}
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full rounded border border-dashed border-[color:var(--color-border)] px-4 py-2 text-sm"
        >
          {isFetchingNextPage ? "さらに読み込み中..." : "さらに読み込む"}
        </button>
      )}
      <p aria-live="polite" className="sr-only">
        {toast}
      </p>
      <DetailDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            updateUrlSelection(null);
          }
        }}
        documentId={selectedId}
        listQueryKey={listQueryKey}
        summary={selectedItem}
        onMessage={(message) => {
          setToast(message);
          setTimeout(() => setToast(""), 4000);
        }}
      />
    </div>
  );
}

function sortLabel(sort: SortKey) {
  switch (sort) {
    case "aiLabel":
      return "AI ラベル";
    case "status":
      return "ステータス";
    default:
      return "作成日";
  }
}

function pillClass(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

type SortButtonProps = {
  label: string;
  active: boolean;
  order: string;
  onClick: () => void;
};

function SortButton({ label, active, order, onClick }: SortButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx("flex items-center gap-1 text-left", active ? "text-[color:var(--color-text)]" : "text-[color:var(--color-text-muted)]")}
    >
      {label}
      <span aria-hidden>{active ? (order === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
