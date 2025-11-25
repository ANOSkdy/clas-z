import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/google/gemini';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const prompt = `
以下のマニュアルの内容を、初心者にもわかりやすく3行以内で要約してください。
また、重要なポイントを1つ箇条書きで挙げてください。

---
${content}
---
`;

    const summary = await generateText(prompt);
    return NextResponse.json({ summary });

  } catch (error) {
    return NextResponse.json({ error: 'Summary failed' }, { status: 500 });
  }
}
