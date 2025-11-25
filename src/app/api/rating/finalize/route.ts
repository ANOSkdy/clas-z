import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { fileId } = await request.json();

    // 1. 本来はここでPDFを解析し財務データを抽出
    // 2. Gemini API にデータを渡してコメント生成
    // 3. Airtable に保存

    // Mock Response
    return NextResponse.json({
      score: 85,
      grade: 'B+',
      comment: '売上高は前年比増収ですが、営業利益率の改善余地があります。経費の見直しを推奨します。（AI生成コメント）',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
