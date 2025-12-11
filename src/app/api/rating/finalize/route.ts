import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { getAirtableBase } from '@/lib/airtable';
import { generateText } from '@/lib/google/gemini';
import { logger } from '@/lib/logger';

const finalizeSchema = z.object({
  fileId: z.string().min(1),
  companyId: z.string().optional(),
});

const FALLBACK_COMMENT =
  'AI コメント生成に失敗したため、標準コメントを表示しています。財務データの確認とコスト構造の見直しを推奨します。';

function deriveGrade(score: number) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 65) return 'B';
  if (score >= 55) return 'C+';
  if (score >= 45) return 'C';
  return 'D';
}

function buildPrompt(fileId: string, score: number, grade: string) {
  return `以下の決算書ファイルをもとに、100〜200文字で経営改善の示唆を含む格付けコメントを日本語で作成してください。\n- ファイルID: ${fileId}\n- 格付けスコア: ${score}\n- 格付けグレード: ${grade}`;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const parsedBody = finalizeSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const { fileId, companyId } = parsedBody.data;

  if (companyId && companyId !== session.companyId) {
    logger.warn('Company mismatch detected in finalize request', {
      sessionCompanyId: session.companyId,
      bodyCompanyId: companyId,
    });
    return NextResponse.json({ error: 'COMPANY_MISMATCH' }, { status: 400 });
  }

  const base = getAirtableBase();
  if (!base) {
    logger.error('Airtable base is not configured');
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }

  try {
    const ratingScore = 85;
    const ratingGrade = deriveGrade(ratingScore);

    let ratingComment = FALLBACK_COMMENT;
    try {
      const prompt = buildPrompt(fileId, ratingScore, ratingGrade);
      ratingComment = await generateText(prompt);
      if (!ratingComment) {
        ratingComment = FALLBACK_COMMENT;
      }
    } catch (error) {
      logger.error('Failed to generate rating comment with Gemini', { err: error });
      ratingComment = FALLBACK_COMMENT;
    }

    const uploadedAt = new Date().toISOString();

    const [record] = await base('FinancialStatements').create([
      {
        fields: {
          company: [session.companyId],
          drive_file_id: fileId,
          rating_score: ratingScore,
          rating_grade: ratingGrade,
          rating_comment: ratingComment,
          uploaded_at: uploadedAt,
        },
      },
    ]);

    return NextResponse.json({
      score: ratingScore,
      grade: ratingGrade,
      comment: ratingComment,
      financialStatementId: record.id,
    });
  } catch (error) {
    logger.error('Failed to finalize rating', { err: error });
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
