import { ClassifyRequestInput, ClassifyResponse } from "./schemas";
import { env } from "./env";
import { TBLine } from "./schemas/tb";

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

export async function extractTrialBalance(input: {
  blobUrl: string;
  language?: string;
}): Promise<{ lines: TBLine[]; confidence?: number }> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const hashSeed = Array.from(input.blobUrl)
    .map((char) => char.charCodeAt(0))
    .reduce((sum, code) => (sum + code) % 997, 0);
  const baseAmount = 50000 + (hashSeed % 10000);
  const lines: TBLine[] = [
    {
      accountCode: "101",
      accountName: "現金",
      debit: baseAmount,
      credit: 0,
    },
    {
      accountCode: "200",
      accountName: "売上高",
      debit: 0,
      credit: baseAmount,
    },
  ];

  return {
    lines,
    confidence: Number(`0.${(hashSeed % 90) + 10}`),
  };
}
