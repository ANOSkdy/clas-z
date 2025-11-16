import { randomUUID } from "crypto";
import { headers } from "next/headers";

import { env } from "@/lib/env";
import type { CompanyRating, DocumentRating } from "@/lib/schemas/rating";

import EventStream from "./_components/EventStream";
import RatingBoard from "./_components/RatingBoard";

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

type RatingResponse = {
  companyId: string | null;
  company: CompanyRating | null;
  documents: ExtendedDocumentRating[];
  events: EventItem[];
  correlationId?: string;
};

async function loadRatingData(): Promise<RatingResponse> {
  const headerStore = headers();
  const invite = headerStore.get("x-clas-invite");
  const incomingCorrelation = headerStore.get("x-correlation-id");
  const correlationId = incomingCorrelation ?? randomUUID();
  try {
    const response = await fetch(`${env.APP_BASE_URL}/api/rating`, {
      headers: {
        "x-correlation-id": correlationId,
        ...(invite ? { "x-clas-invite": invite } : {}),
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return { companyId: null, company: null, documents: [], events: [] };
    }
    const data = await response.json();
    const derivedCompanyId = data.companyId ?? data.company?.companyId ?? data.documents?.[0]?.companyId ?? null;
    return {
      companyId: derivedCompanyId ?? "demo-company",
      company: data.company ?? null,
      documents: Array.isArray(data.documents) ? (data.documents as ExtendedDocumentRating[]) : [],
      events: Array.isArray(data.events) ? (data.events as EventItem[]) : [],
      correlationId: data.correlationId,
    };
  } catch (error) {
    console.error(error);
    return { companyId: "demo-company", company: null, documents: [], events: [] };
  }
}

export default async function PcRatingPage() {
  const data = await loadRatingData();

  return (
    <section className="space-y-6" aria-labelledby="rating-dashboard-heading">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">rating</p>
        <h1 id="rating-dashboard-heading" className="text-2xl font-semibold">
          レーティングダッシュボード
        </h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          会社と書類ごとのスコア推移・イベントを一目で把握し、必要に応じて即座に再計算できます。
        </p>
      </header>

      <RatingBoard initialCompany={data.company} initialDocuments={data.documents} companyId={data.companyId} />
      <EventStream initialEvents={data.events} companyId={data.companyId} />
    </section>
  );
}
