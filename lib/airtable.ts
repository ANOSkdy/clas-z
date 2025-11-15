import { IS_MOCK, env } from "./env";

const API = "https://api.airtable.com/v0";

type AirtableRecord<TFields> = {
  id: string;
  createdTime?: string;
  fields: TFields;
};

async function atFetch(path: string, init: RequestInit = {}) {
  if (!env.AIRTABLE_BASE_ID || !env.AIRTABLE_API_KEY) {
    throw new Error("Airtable env is missing");
  }

  const url = `${API}/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(path)}`;
  return fetch(url, {
    ...init,
    headers: {
      "Authorization": `Bearer ${env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

export async function listRecords<TFields extends Record<string, unknown> = Record<string, unknown>>(
  table: string,
  params?: Record<string, string>
): Promise<{ records: AirtableRecord<TFields>[] }> {
  if (IS_MOCK) {
    const now = new Date().toISOString();
    if (table === "Documents") {
      const record: AirtableRecord<TFields> = {
        id: "doc_mock_1",
        createdTime: now,
        fields: {
          title: "Sample.pdf",
          blobUrl: "#",
          size: 123456,
        } as TFields,
      };
      return { records: [record] };
    }
    if (table === "Tasks") {
      const record: AirtableRecord<TFields> = {
        id: "task_mock_1",
        createdTime: now,
        fields: {
          title: "確認: Sample.pdf",
          status: "open",
          assignee: "Mock User",
        } as TFields,
      };
      return { records: [record] };
    }
    const records: AirtableRecord<TFields>[] = [];
    return { records };
  }

  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await atFetch(`${table}${qs}`, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Airtable list ${table} failed: ${res.status}`);
  }
  return res.json() as Promise<{ records: AirtableRecord<TFields>[] }>;
}

export async function createRecord<TFields extends Record<string, unknown> = Record<string, unknown>>(
  table: string,
  fields: TFields,
): Promise<AirtableRecord<TFields>> {
  if (IS_MOCK) {
    return {
      id: "mock_" + Math.random().toString(36).slice(2),
      createdTime: new Date().toISOString(),
      fields,
    };
  }
  const res = await atFetch(table, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    throw new Error(`Airtable create ${table} failed: ${res.status}`);
  }
  return res.json() as Promise<AirtableRecord<TFields>>;
}