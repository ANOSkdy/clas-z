import Airtable from 'airtable';

// 環境変数が設定されていない場合のフォールバック（開発用）
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

// Airtableインスタンスの初期化
// APIキーがない場合はnullを返す（API側でハンドリングする）
export const getAirtableBase = () => {
  if (!apiKey || !baseId) {
    console.warn('Airtable API Key or Base ID is missing.');
    return null;
  }
  return new Airtable({ apiKey }).base(baseId);
};
