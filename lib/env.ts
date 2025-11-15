import { z } from "zod";

const EnvSchema = z.object({
  AIRTABLE_API_KEY: z.string().min(1).optional(),
  AIRTABLE_BASE_ID: z.string().min(1).optional(),
});

const parsed = EnvSchema.safeParse({
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
});

export const env = {
  AIRTABLE_API_KEY: (parsed.success && parsed.data.AIRTABLE_API_KEY) || "",
  AIRTABLE_BASE_ID: (parsed.success && parsed.data.AIRTABLE_BASE_ID) || "",
};

// Airtable未設定ならモード=モック
export const IS_MOCK = !(env.AIRTABLE_API_KEY && env.AIRTABLE_BASE_ID);