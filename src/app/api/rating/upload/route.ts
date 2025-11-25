import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAuthBypassEnabled } from '@/lib/auth';
import { uploadToDrive } from '@/lib/google/drive';

// 4.5MB制限の注意書き: Vercel Serverless Function limit
export const maxDuration = 60; // タイムアウト延長（Proプラン等で有効）

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isAuthBypassEnabled()) {
    return NextResponse.json({
      success: true,
      fileId: 'demo-file-id',
      link: '#',
      mode: 'bypass'
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Google Drive へアップロード
    // 実際には companyId 等をファイル名に含める
    const fileName = `FY_${new Date().getFullYear()}_${file.name}`;
    const result = await uploadToDrive(file, fileName, file.type);

    return NextResponse.json({ 
      success: true, 
      fileId: result.id, 
      link: result.webViewLink 
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
