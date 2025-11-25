import Airtable from 'airtable';

// PAT と旧 API Key の両方を許容する
const apiKey = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const endpointUrl = process.env.AIRTABLE_ENDPOINT_URL;

// Airtableインスタンスの初期化
// APIキーがない場合はnullを返す（API側でハンドリングする）
export const getAirtableBase = () => {
  if (!apiKey || !baseId) {
    console.warn('Airtable API Key or Base ID is missing.');
    return null;
  }
  return new Airtable({ apiKey, endpointUrl }).base(baseId);
};
