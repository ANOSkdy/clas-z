import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      APP_BASE_URL: "http://127.0.0.1:3000",
      AIRTABLE_API_KEY: "test",
      AIRTABLE_BASE_ID: "test",
      AIRTABLE_ENDPOINT_URL: "https://api.airtable.com/v0",
      GEMINI_API_KEY: "test",
      BLOB_READ_WRITE_TOKEN: "test",
    },
  },
});
