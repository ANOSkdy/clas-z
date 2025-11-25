import { GoogleGenerativeAI } from '@google/generative-ai';

// APIキーの取得
const apiKey = process.env.GEMINI_API_KEY;

// インスタンス化 (APIキーがない場合はnull)
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateText(prompt: string): Promise<string> {
  if (!genAI) {
    console.warn('GEMINI_API_KEY is missing. Returning mock response.');
    return '（Gemini APIキーが設定されていないため、これはモックの回答です。APIキーを設定すると、AIがマニュアルの内容を要約してくれます。）';
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    return 'AI生成中にエラーが発生しました。';
  }
}
