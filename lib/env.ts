export const env = {
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY ?? "",
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID ?? "",
  APP_BASE_URL: process.env.APP_BASE_URL ?? "",
};
if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) {
  console.warn("[env] Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
}
