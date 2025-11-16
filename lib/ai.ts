import { ClassifyRequestInput, ClassifyResponse } from "./schemas";
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
