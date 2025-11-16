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

type SortParam = {
  field: string;
  direction?: "asc" | "desc";
};

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function airtableFetch(
  path: string,
  init: RequestInit,
  attempt = 0,
  options: RequestOptions = DEFAULT_OPTIONS,
): Promise<Response> {
  const url = `${env.AIRTABLE_ENDPOINT_URL.replace(/\/$/, "")}/${env.AIRTABLE_BASE_ID}/${path}`;
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

function toListQuery(params?: {
  view?: string;
  filterByFormula?: string;
  maxRecords?: number;
  pageSize?: number;
  offset?: string;
  sort?: SortParam[];
  fields?: string[];
}): string {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.view) search.append("view", params.view);
  if (params.filterByFormula) search.append("filterByFormula", params.filterByFormula);
  if (typeof params.maxRecords === "number") search.append("maxRecords", String(params.maxRecords));
  if (typeof params.pageSize === "number") search.append("pageSize", String(params.pageSize));
  if (params.offset) search.append("offset", params.offset);
  params.fields?.forEach((field) => {
    if (!field) return;
    search.append("fields[]", field);
  });
  params.sort?.forEach((sort, index) => {
    if (!sort?.field) return;
    search.append(`sort[${index}][field]`, sort.field);
    if (sort.direction) {
      search.append(`sort[${index}][direction]`, sort.direction);
    }
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

export async function createRecordsBatch<TFields extends Record<string, unknown>>(
  table: string,
  records: TFields[],
  options?: RequestOptions,
): Promise<AirtableRecord<TFields>[]> {
  const chunks: AirtableRecord<TFields>[] = [];
  for (let i = 0; i < records.length; i += 10) {
    const slice = records.slice(i, i + 10);
    const response = await airtableFetch(
      encodeURIComponent(table),
      {
        method: "POST",
        body: JSON.stringify({ records: slice.map((fields) => ({ fields })) }),
      },
      0,
      options,
    );
    const data = (await response.json()) as AirtableListResponse<TFields>;
    chunks.push(...data.records);
  }
  return chunks;
}

export async function listRecords<TFields extends Record<string, unknown>>(
  table: string,
  params?: {
    view?: string;
    filterByFormula?: string;
    maxRecords?: number;
    pageSize?: number;
    offset?: string;
    sort?: SortParam[];
    fields?: string[];
  },
  options?: RequestOptions,
): Promise<AirtableListResponse<TFields> & { offset?: string }> {
  const query = toListQuery(params);
  const response = await airtableFetch(
    `${encodeURIComponent(table)}${query}`,
    { method: "GET" },
    0,
    options,
  );
  return (await response.json()) as AirtableListResponse<TFields> & { offset?: string };
}

export async function updateRecord<TFields extends Record<string, unknown>>(
  table: string,
  id: string,
  fields: Partial<TFields>,
  options?: RequestOptions,
): Promise<AirtableRecord<TFields>> {
  const response = await airtableFetch(
    `${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    },
    0,
    options,
  );
  return (await response.json()) as AirtableRecord<TFields>;
}

export async function deleteRecords(
  table: string,
  ids: string[],
  options?: RequestOptions,
): Promise<void> {
  for (let i = 0; i < ids.length; i += 10) {
    const slice = ids.slice(i, i + 10);
    await airtableFetch(
      `${encodeURIComponent(table)}?${slice.map((id) => `records[]=${encodeURIComponent(id)}`).join("&")}`,
      { method: "DELETE" },
      0,
      options,
    );
  }
}

export async function getRecord<TFields extends Record<string, unknown>>(
  table: string,
  id: string,
  options?: RequestOptions,
): Promise<AirtableRecord<TFields>> {
  const response = await airtableFetch(
    `${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
    { method: "GET" },
    0,
    options,
  );
  return (await response.json()) as AirtableRecord<TFields>;
}
