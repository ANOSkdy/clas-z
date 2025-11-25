const apiKey = process.env.GEMINI_API_KEY;

export async function generateText(prompt: string): Promise<string> {
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is missing. Returning mock response.');
    return '（Gemini APIキーが設定されていないため、これはモックの回答です。APIキーを設定すると、AIがマニュアルの内容を要約してくれます。）';
  }

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      console.error('Gemini API Error:', response.status, await response.text());
      return 'AI生成中にエラーが発生しました。';
    }

    const data: { candidates?: { content?: { parts?: { text?: string }[] } }[] } = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ?? 'AI生成中にエラーが発生しました。';
  } catch (error) {
    console.error('Gemini API Error:', error);
    return 'AI生成中にエラーが発生しました。';
  }
}
