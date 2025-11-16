import { randomUUID } from "crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/env";
import type { ReviewListItem } from "@/lib/schemas/review";
import ReviewGrid from "./_components/ReviewGrid";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

type SearchState = {
  q?: string;
  status?: string;
  companyId?: string;
  sort?: string;
  order?: string;
  id?: string;
};

export const metadata: Metadata = {
  title: "PC Review",
};

const STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "未確認" },
  { value: "confirmed", label: "確定済" },
  { value: "rejected", label: "差戻し" },
];

function resolveSearchParams(params: SearchState) {
  return {
    q: typeof params.q === "string" ? params.q : "",
    status: typeof params.status === "string" ? params.status : "pending",
    companyId: typeof params.companyId === "string" ? params.companyId : "",
    sort: typeof params.sort === "string" ? params.sort : "createdAt",
    order: typeof params.order === "string" ? params.order : "desc",
    id: typeof params.id === "string" ? params.id : undefined,
  };
}

async function getInitialData(search: ReturnType<typeof resolveSearchParams>) {
  const searchParams = new URLSearchParams();
  if (search.q) searchParams.set("q", search.q);
  if (search.status) searchParams.set("status", search.status);
  if (search.companyId) searchParams.set("companyId", search.companyId);
  if (search.sort) searchParams.set("sort", search.sort);
  if (search.order) searchParams.set("order", search.order);
  searchParams.set("limit", "50");

  const url = `${env.APP_BASE_URL.replace(/\/$/, "")}/api/review?${searchParams.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { "x-correlation-id": randomUUID() },
      cache: "no-store",
    });
    if (!res.ok) {
      return { items: [], cursor: undefined };
    }
    const json = (await res.json()) as { items: ReviewListItem[]; nextCursor?: string };
    return { items: json.items, cursor: json.nextCursor };
  } catch {
    return { items: [], cursor: undefined };
  }
}

export default async function PcReviewPage({ searchParams }: { searchParams: PageSearchParams }) {
  const resolved = resolveSearchParams(await searchParams);
  const initial = await getInitialData(resolved);

  return (
    <section className="space-y-6" aria-labelledby="pc-review-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">review</p>
          <h1 id="pc-review-heading" className="text-2xl font-semibold">
            PC レビュー
          </h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            DataGrid で Documents をキーボード操作 / サーバーフィルタ込みで追い込みます。
          </p>
        </div>
        <Link href="/pc" className="btn btn-secondary text-sm" aria-label="PC ホームに戻る">
          戻る
        </Link>
      </div>
      <form className="card space-y-4" method="get">
        <div className="grid gap-4 md:grid-cols-3" aria-label="検索フィルター">
          <label className="text-sm font-medium text-[color:var(--color-text-muted)]">
            キーワード
            <input
              type="search"
              name="q"
              defaultValue={resolved.q}
              className="mt-1 w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2 text-base"
              placeholder="ファイル名 / AI ラベル"
            />
          </label>
          <label className="text-sm font-medium text-[color:var(--color-text-muted)]">
            ステータス
            <select
              name="status"
              defaultValue={resolved.status}
              className="mt-1 w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2 text-base"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-[color:var(--color-text-muted)]">
            会社 ID
            <input
              type="text"
              name="companyId"
              defaultValue={resolved.companyId}
              className="mt-1 w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2 text-base"
              placeholder="company_xxx"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <button type="submit" className="btn-primary">
            更新
          </button>
          <a href="/pc/review" className="btn-secondary flex items-center justify-center">
            リセット
          </a>
        </div>
      </form>
      <ReviewGrid
        key={JSON.stringify(resolved)}
        initialItems={initial.items}
        initialCursor={initial.cursor}
        query={{
          q: resolved.q,
          status: resolved.status,
          companyId: resolved.companyId,
          sort: resolved.sort,
          order: resolved.order,
        }}
        initialSelectedId={resolved.id}
      />
    </section>
  );
}
