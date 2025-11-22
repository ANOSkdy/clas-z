import type { Metadata } from "next";
import Link from "next/link";
import { listRecords } from "@/lib/airtable";
import { ReviewListQuerySchema, type ReviewListItem, type ReviewListQuery } from "@/lib/schemas/review";
import {
  DOCUMENTS_TABLE,
  REVIEW_REQUESTED_FIELDS,
  SORT_FIELD_MAP,
  buildFilterFormula,
  mapRecordToListItem,
  type DocumentReviewFields,
} from "@/app/api/review/utils";
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

const PAGE_SIZE = 50;

export const metadata: Metadata = {
  title: "PC Review",
};

const STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "未確認" },
  { value: "confirmed", label: "確定済" },
  { value: "rejected", label: "差戻し" },
];

function resolveReviewQuery(params: SearchState): ReviewListQuery {
  const parsed = ReviewListQuerySchema.safeParse({
    q: typeof params.q === "string" && params.q ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    companyId: typeof params.companyId === "string" && params.companyId ? params.companyId : undefined,
    sort: typeof params.sort === "string" ? params.sort : undefined,
    order: typeof params.order === "string" ? params.order : undefined,
    limit: PAGE_SIZE,
  });
  if (parsed.success) {
    return parsed.data;
  }
  return ReviewListQuerySchema.parse({ limit: PAGE_SIZE });
}

function resolveSelectedId(params: SearchState) {
  return typeof params.id === "string" ? params.id : undefined;
}

async function getInitialData(
  query: ReviewListQuery,
): Promise<{ items: ReviewListItem[]; cursor?: string | undefined }> {
  try {
    const filterByFormula = buildFilterFormula(query);
    const sortField = SORT_FIELD_MAP[query.sort] ?? SORT_FIELD_MAP.createdAt;
    const airtableResponse = await listRecords<DocumentReviewFields>(DOCUMENTS_TABLE, {
      filterByFormula,
      pageSize: query.limit,
      sort: [{ field: sortField, direction: query.order }],
      fields: [...REVIEW_REQUESTED_FIELDS],
    });
    return {
      items: airtableResponse.records.map(mapRecordToListItem),
      cursor: airtableResponse.offset,
    };
  } catch {
    return { items: [], cursor: undefined };
  }
}

export default async function PcReviewPage({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  const query = resolveReviewQuery(params);
  const selectedId = resolveSelectedId(params);
  const initial = await getInitialData(query);

  return (
    <section className="space-y-6" aria-labelledby="pc-review-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">review</p>
          <h1 id="pc-review-heading" className="text-2xl font-semibold">
            PC レビュー
          </h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            DataGrid で Documents をキーボード操作 / サーバーフィルタ込みで追い込みます。
          </p>
        </div>
        <Link
          href="/pc"
          className="btn btn-secondary text-sm w-full sm:w-auto"
          aria-label="PC ホームに戻る"
        >
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
              defaultValue={query.q ?? ""}
              className="mt-1 w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2 text-base"
              placeholder="ファイル名 / AI ラベル"
            />
          </label>
          <label className="text-sm font-medium text-[color:var(--color-text-muted)]">
            ステータス
            <select
              name="status"
              defaultValue={query.status}
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
              defaultValue={query.companyId ?? ""}
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
        key={JSON.stringify({ query, selectedId })}
        initialItems={initial.items}
        initialCursor={initial.cursor}
        query={{
          q: query.q,
          status: query.status,
          companyId: query.companyId,
          sort: query.sort,
          order: query.order,
        }}
        initialSelectedId={selectedId}
      />
    </section>
  );
}
