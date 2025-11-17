import { ClassifyRequestInput, ClassifyResponse } from "./schemas";
import type { ScheduleEvent } from "./schemas/schedule";
import { TBLine } from "./schemas/tb";
import { env } from "./env";

export async function classifyDocument(input: ClassifyRequestInput): Promise<ClassifyResponse> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const fallbackConfidence = Number(`0.${input.documentId.replace(/\D/g, "").slice(0, 2) || "42"}`);

  return {
    aiLabel: "needs_review",
    confidence: Math.max(0.1, Math.min(0.95, fallbackConfidence || 0.42)),
    ocrText: `Stubbed OCR for ${input.documentId} (${input.language ?? "ja"}).`,
  };
}

type ExtractTrialBalanceInput = {
  blobUrl: string;
  language?: string;
};

export async function extractTrialBalance(
  input: ExtractTrialBalanceInput,
): Promise<{ lines: TBLine[]; confidence?: number }> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const hashSeed = Array.from(input.blobUrl)
    .map((char) => char.charCodeAt(0))
    .reduce((acc, code) => acc + code, 0);

  const sampleLines: TBLine[] = [
    {
      accountCode: "1000",
      accountName: "現金",
      debit: 150000 + (hashSeed % 1000),
      credit: 0,
    },
    {
      accountCode: "2000",
      accountName: "売掛金",
      debit: 0,
      credit: 50000 + (hashSeed % 400),
      note: `${input.language ?? "ja"} 解析 (stub)`,
    },
    {
      accountCode: "3000",
      accountName: "売上高",
      debit: 0,
      credit: 100000 + (hashSeed % 600),
    },
  ];

  return {
    lines: sampleLines,
    confidence: Number(`0.${hashSeed % 90}`),
  };
}

export async function suggestSchedule(input: {
  companyId: string;
  windowStart?: string;
  windowEnd?: string;
  seed?: string;
}): Promise<Array<Omit<ScheduleEvent, "id" | "companyId" | "icalUid" | "status" | "source" | "createdAt" | "updatedAt">>> {
  const now = input.windowStart ? new Date(input.windowStart) : new Date();
  const proposal1 = new Date(now.getTime() + 1000 * 60 * 60 * 48);
  const proposal2 = new Date(now.getTime() + 1000 * 60 * 60 * 72);
  return [
    {
      title: "レビューセッション",
      description: input.seed ? `シード: ${input.seed}` : undefined,
      startsAt: proposal1.toISOString(),
      endsAt: new Date(proposal1.getTime() + 60 * 60 * 1000).toISOString(),
      timezone: "UTC",
      location: "オンライン",
      attendees: [],
      source: "ai" as const,
    },
    {
      title: "ハンドオフ",
      description: "次のステップを整理",
      startsAt: proposal2.toISOString(),
      endsAt: new Date(proposal2.getTime() + 45 * 60 * 1000).toISOString(),
      timezone: "UTC",
      location: "オンライン",
      attendees: [],
      source: "ai" as const,
    },
  ];
}
