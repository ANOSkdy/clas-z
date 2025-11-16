import { env } from "./env";

export type AirtableRecord<TFields extends Record<string, unknown>> = {
  id: string;
  createdTime: string;
  fields: TFields;
};

export type AirtableListResponse<TFields extends Record<string, unknown>> = {
  records: AirtableRecord<TFields>[];
};

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const DEFAULT_OPTIONS = {
  maxRetries: 3,
  backoffMs: 350,
};

type RequestOptions = {
  maxRetries?: number;
  backoffMs?: number;
};

const baseUrl = env.AIRTABLE_ENDPOINT_URL.replace(/\/$/, "");

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function airtableFetch(
  path: string,
  init: RequestInit,
  attempt = 0,
  options: RequestOptions = DEFAULT_OPTIONS,
): Promise<Response> {
  const url = `${baseUrl}/${env.AIRTABLE_BASE_ID}/${path}`;
  const headers: HeadersInit = {
    Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
    ...init.headers,
  };

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (RETRYABLE_STATUS.has(response.status) && attempt < (options.maxRetries ?? DEFAULT_OPTIONS.maxRetries)) {
    const wait = (options.backoffMs ?? DEFAULT_OPTIONS.backoffMs) * (attempt + 1);
    await delay(wait);
    return airtableFetch(path, init, attempt + 1, options);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable API error (${response.status}): ${text}`);
  }

  return response;
}

function toQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "undefined" || value === null) return;
    search.append(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function getRecords<TFields extends Record<string, unknown>>(
  table: string,
  params?: {
    view?: string;
    filterByFormula?: string;
    maxRecords?: number;
  },
  options?: RequestOptions,
): Promise<AirtableRecord<TFields>[]> {
  const query = toQuery({
    view: params?.view,
    filterByFormula: params?.filterByFormula,
    maxRecords: params?.maxRecords,
  });
  const response = await airtableFetch(
    `${encodeURIComponent(table)}${query}`,
    { method: "GET" },
    0,
    options,
  );
  const data = (await response.json()) as AirtableListResponse<TFields>;
  return data.records;
}

export async function createRecord<TFields extends Record<string, unknown>>(
  table: string,
  fields: TFields,
  options?: RequestOptions,
): Promise<AirtableRecord<TFields>> {
  const response = await airtableFetch(
    encodeURIComponent(table),
    {
      method: "POST",
      body: JSON.stringify({ fields }),
    },
    0,
    options,
  );
  return (await response.json()) as AirtableRecord<TFields>;
}
