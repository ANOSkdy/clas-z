import Airtable from 'airtable';

type AirtableConfig = {
  apiKey?: string;
  baseId?: string;
  endpointUrl: string;
};

export const getAirtableConfig = (): AirtableConfig => ({
  apiKey: process.env.AIRTABLE_API_KEY,
  baseId: process.env.AIRTABLE_BASE_ID,
  endpointUrl: process.env.AIRTABLE_ENDPOINT_URL ?? 'https://api.airtable.com',
});

// Airtableインスタンスの初期化
// APIキーがない場合はnullを返す（API側でハンドリングする）
export const getAirtableBase = (config?: AirtableConfig) => {
  const resolvedConfig = config ?? getAirtableConfig();
  const { apiKey, baseId, endpointUrl } = resolvedConfig;

  if (!apiKey || !baseId) {
    console.warn('[AirtableConfig] Airtable API Key or Base ID is missing.', {
      hasApiKey: Boolean(apiKey),
      hasBaseId: Boolean(baseId),
      endpointUrl,
    });
    return null;
  }

  return new Airtable({ apiKey, endpointUrl }).base(baseId);
};

export type { AirtableConfig };
