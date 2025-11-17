import { z } from "zod";

if (typeof window !== "undefined") {
  throw new Error("lib/env.ts はサーバー専用です");
}

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  APP_BASE_URL: z.string().url("APP_BASE_URL は URL 形式で指定してください"),
  AIRTABLE_API_KEY: z.string().min(1, "AIRTABLE_API_KEY が必要です"),
  AIRTABLE_BASE_ID: z.string().min(1, "AIRTABLE_BASE_ID が必要です"),
  AIRTABLE_ENDPOINT_URL: z
    .string()
    .url("AIRTABLE_ENDPOINT_URL は URL 形式")
    .default("https://api.airtable.com/v0"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY が必要です"),
  BLOB_READ_WRITE_TOKEN: z.string().min(1, "BLOB_READ_WRITE_TOKEN が必要です"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET が必要です"),
  AUTH_COOKIE_NAME: z
    .string()
    .min(1, "AUTH_COOKIE_NAME が必要です")
    .default("clas_z_session"),
  AUTH_DEV_EMAILS: z.string().optional(),
});

type EnvShape = z.infer<typeof EnvSchema>;

let cachedEnv: EnvShape | null = null;

function loadEnv(): EnvShape {
  if (cachedEnv) return cachedEnv;

  const parsed = EnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    APP_BASE_URL: process.env.APP_BASE_URL,
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    AIRTABLE_ENDPOINT_URL: process.env.AIRTABLE_ENDPOINT_URL ?? "https://api.airtable.com/v0",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME ?? "clas_z_session",
    AUTH_DEV_EMAILS: process.env.AUTH_DEV_EMAILS,
  });

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");
    throw new Error(`環境変数の検証に失敗しました:\n${formatted}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getEnv(): EnvShape {
  return loadEnv();
}

type EnvKey = keyof EnvShape;

export const env = new Proxy({} as EnvShape, {
  get(_target, prop: string) {
    return loadEnv()[prop as EnvKey];
  },
});

export type AppEnv = EnvShape;
