import { IS_MOCK, env } from "./env";

const API = "https://api.airtable.com/v0";

export type AirtableRecord<TFields extends Record<string, unknown>> = {
  id: string;
  createdTime?: string;
  fields: TFields;
};

export type DocumentFields = {
  title: string;
  blobUrl: string;
  size: number;
};

export type TaskFields = {
  title: string;
  status?: string;
  assignee?: string;
};

type TableFieldMap = {
  Documents: DocumentFields;
  Tasks: TaskFields;
};

type GenericFields = Record<string, unknown>;

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

export async function listRecords<TName extends keyof TableFieldMap>(
  table: TName,
  params?: Record<string, string>,
): Promise<{ records: AirtableRecord<TableFieldMap[TName]>[] }>;
export async function listRecords<TFields extends GenericFields>(
  table: string,
  params?: Record<string, string>,
): Promise<{ records: AirtableRecord<TFields>[] }>;
export async function listRecords(
  table: string,
  params?: Record<string, string>,
): Promise<{ records: AirtableRecord<GenericFields>[] }> {
  if (IS_MOCK) {
    const now = new Date().toISOString();
    if (table === "Documents") {
      const record = {
        id: "doc_mock_1",
        createdTime: now,
        fields: {
          title: "Sample.pdf",
          blobUrl: "#",
          size: 123456,
        },
      } satisfies AirtableRecord<DocumentFields>;
      return { records: [record] } as { records: AirtableRecord<GenericFields>[] };
    }
    if (table === "Tasks") {
      const record = {
        id: "task_mock_1",
        createdTime: now,
        fields: {
          title: "確認: Sample.pdf",
          status: "open",
          assignee: "Mock User",
        },
      } satisfies AirtableRecord<TaskFields>;
      return { records: [record] } as { records: AirtableRecord<GenericFields>[] };
    }
    return { records: [] };
  }

  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await atFetch(`${table}${qs}`, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Airtable list ${table} failed: ${res.status}`);
  }
  return res.json() as Promise<{ records: AirtableRecord<GenericFields>[] }>;
}

export async function createRecord<TName extends keyof TableFieldMap>(
  table: TName,
  fields: TableFieldMap[TName],
): Promise<AirtableRecord<TableFieldMap[TName]>>;
export async function createRecord<TFields extends GenericFields>(
  table: string,
  fields: TFields,
): Promise<AirtableRecord<TFields>>;
export async function createRecord(
  table: string,
  fields: GenericFields,
): Promise<AirtableRecord<GenericFields>> {
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
  return res.json() as Promise<AirtableRecord<GenericFields>>;
}
