import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";

declare global {
  var IntersectionObserver: typeof IntersectionObserver;
}

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto;
}

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
  observe() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve() {}
}

globalThis.IntersectionObserver = MockIntersectionObserver;

process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";
process.env.AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY ?? "test";
process.env.AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID ?? "test";
process.env.AIRTABLE_ENDPOINT_URL = process.env.AIRTABLE_ENDPOINT_URL ?? "https://api.airtable.com/v0";
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "test";
process.env.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "test";
