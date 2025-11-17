import { ClassifyRequestInput, ClassifyResponse } from "./schemas";
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

type SuggestScheduleInput = {
  companyId: string;
  windowStart?: string;
  windowEnd?: string;
  seed?: string;
};

export async function suggestSchedule(input: SuggestScheduleInput) {
  const base = input.seed ?? input.companyId;
  const now = new Date();
  const inHours = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
  const proposals = [
    {
      title: "Review Session",
      description: "AI 提案: 直近の進捗確認ミーティング", 
      startsAt: input.windowStart ?? inHours(48),
      endsAt: input.windowEnd ?? inHours(49),
      timezone: undefined,
      location: "オンライン",
      attendees: ["owner@example.com"],
    },
    {
      title: "Handoff",
      description: "AI 提案: 次の担当者への引き継ぎ", 
      startsAt: inHours(72),
      endsAt: inHours(73),
      timezone: undefined,
      location: "オフィス",
      attendees: ["team@example.com"],
    },
  ];
  const shift = base
    .split("")
    .map((c) => c.charCodeAt(0))
    .reduce((a, b) => a + b, 0);
  return proposals.map((proposal, index) => {
    const start = new Date(proposal.startsAt);
    const end = new Date(proposal.endsAt);
    const delta = (shift + index * 7) % 1800000;
    return {
      ...proposal,
      startsAt: new Date(start.getTime() + delta).toISOString(),
      endsAt: new Date(end.getTime() + delta).toISOString(),
    };
  });
}
