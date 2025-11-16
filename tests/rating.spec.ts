import { expect, test } from "@playwright/test";

const now = new Date().toISOString();
const scoreboardPayload = {
  companyId: "demo-company",
  company: { companyId: "demo-company", score: 92, level: "A", computedAt: now },
  documents: [
    {
      documentId: "doc-play",
      companyId: "demo-company",
      score: 92,
      level: "A",
      computedAt: now,
      breakdown: { confidence: 45, statusBonus: 20, metaCompleteness: 20, speedBonus: 7 },
      fileName: "Sample Contract.pdf",
      aiLabel: "contract",
      status: "confirmed",
      updatedAt: now,
    },
  ],
  events: [
    {
      id: "evt-1",
      type: "rating.computed",
      source: "/api/rating/compute",
      createdAt: now,
      correlationId: "cid-1234",
    },
  ],
  correlationId: "cid-root",
};

test("pc rating dashboard recomputes score", async ({ page }) => {
  await page.route("**/api/rating?company=demo-company**", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(scoreboardPayload) });
  });

  await page.route("**/api/rating/compute", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ scope: "company", company: scoreboardPayload.company, documents: scoreboardPayload.documents, correlationId: "cid-2" }),
    });
  });

  await page.goto("/pc/rating");
  await page.getByRole("button", { name: "再計算" }).click();
  await expect(page.getByRole("cell", { name: "Sample Contract.pdf" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "92.0" })).toBeVisible();
  await expect(page.getByText("rating.computed")).toBeVisible();
});
