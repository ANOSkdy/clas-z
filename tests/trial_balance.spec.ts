import { expect, test } from "@playwright/test";

const sampleLines = [
  { accountCode: "100", accountName: "現金", debit: 1200, credit: 0 },
  { accountCode: "200", accountName: "売上高", debit: 0, credit: 1200 },
];

const stats = { count: 2, debitTotal: 1200, creditTotal: 1200, balanced: true };

test("trial balance flow from parse to send", async ({ page }) => {
  await page.route("**/api/tb/parse/csv", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ lines: sampleLines, stats }),
    });
  });

  await page.route("**/api/tb", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ tbId: "tb-play" }) });
  });

  await page.route("**/api/tb/tb-play/lines", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, totals: stats, header: { status: "ready" } }),
    });
  });

  await page.route("**/api/tb/tb-play/send", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/pc/trial_balance");
  await page.getByRole("button", { name: "CSV を解析" }).click();
  await page.getByRole("button", { name: "TB を作成" }).click();
  await page.getByRole("button", { name: "Airtable へ保存" }).click();
  await page.getByRole("button", { name: "送付モーダルを開く" }).click();
  await page.getByLabel(/宛先/).fill("finance@example.com");
  await page.getByRole("button", { name: "送信" }).click();
  await expect(page.getByText("送付しました")).toBeVisible();
});
