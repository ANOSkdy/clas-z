import { test, expect } from "@playwright/test";

const listPayload = {
  items: [
    {
      id: "doc-play-1",
      fileName: "Playwright Sample.pdf",
      blobUrl: "https://example.com/sample.pdf",
      mimeType: "application/pdf",
      size: 5120,
      status: "pending",
      aiLabel: "invoice",
      aiConfidence: 0.88,
      companyId: "comp-900",
      companyName: "Playwright Inc",
      uploaderUserId: "user-play",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rejectReason: null,
    },
  ],
  nextCursor: null,
};

const detailPayload = {
  ...listPayload.items[0],
  note: null,
};

test("pc review flow confirms a document", async ({ page }) => {
  await page.route("**/api/review?**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(listPayload),
    });
  });
  await page.route("**/api/review/doc-play-1", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(detailPayload) });
  });
  await page.route("**/api/review/doc-play-1/confirm", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/pc/review");
  const row = page.getByRole("row", { name: /Playwright Sample/ });
  await row.click();
  await expect(page.getByRole("heading", { name: /Playwright Sample/ })).toBeVisible();
  await page.getByRole("button", { name: "確認する" }).click();
  await expect(row.getByText("確定")).toBeVisible();
});
