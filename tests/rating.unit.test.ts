import { describe, expect, it } from "vitest";

import { computeDocumentRating, grade } from "../lib/rating";

describe("rating grade", () => {
  it("maps numeric score to rating level", () => {
    expect(grade(90)).toBe("A");
    expect(grade(70)).toBe("B");
    expect(grade(50)).toBe("C");
    expect(grade(10)).toBe("D");
  });
});

describe("computeDocumentRating", () => {
  it("sums score components and clamps to 100", () => {
    const result = computeDocumentRating({
      doc: {
        id: "doc-1",
        companyId: "comp-1",
        status: "confirmed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      classifyConfidence: 0.8,
      meta: { fileName: "invoice.pdf", mimeType: "application/pdf", size: 1000 },
      timings: {
        uploadedAt: new Date(Date.now() - 20_000).toISOString(),
        classifiedAt: new Date().toISOString(),
      },
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.level).toBe("A");
  });
});

