import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/auth';
import { getAirtableBase, getAirtableConfig } from '@/lib/airtable';

export async function POST(request: NextRequest) {
  try {
    const { loginId, password } = await request.json();

    if (!loginId || !password) {
      return NextResponse.json({ error: 'IDとパスワードを入力してください' }, { status: 400 });
    }

    const airtableConfig = getAirtableConfig();
    const usersUrl = `${airtableConfig.endpointUrl?.replace(/\/$/, '')}/${airtableConfig.baseId ?? 'missing-base-id'}/Users`;

    if (!airtableConfig.apiKey || !airtableConfig.baseId) {
      console.error('[AirtableConfig][login] Missing Airtable environment variables', {
        hasApiKey: Boolean(airtableConfig.apiKey),
        hasBaseId: Boolean(airtableConfig.baseId),
        endpoint: airtableConfig.endpointUrl,
      });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    console.log('[AirtableDebug][login]', {
      endpoint: airtableConfig.endpointUrl,
      baseId: airtableConfig.baseId,
      usersUrl,
      hasApiKey: Boolean(airtableConfig.apiKey),
      apiKeyLength: airtableConfig.apiKey?.length ?? 0,
    });

    const base = getAirtableBase(airtableConfig);
    if (!base) {
      console.error('[AirtableConfig][login] Airtable connection failed despite env values', {
        endpoint: airtableConfig.endpointUrl,
        baseId: airtableConfig.baseId,
      });
      return NextResponse.json({ error: 'システムエラー: DB未接続' }, { status: 500 });
    }

    let records;
    try {
      records = await base('Users')
        .select({
          filterByFormula: `{login_id} = '${loginId}'`,
          maxRecords: 1,
        })
        .firstPage();
    } catch (err: any) {
      console.error('[Login] Airtable query failed', {
        statusCode: err?.statusCode,
        error: err?.error,
        message: err?.message,
        usersUrl,
      });

      // Airtable の 404（NOT_FOUND）はテーブル名や Base ID の不整合が原因のことが多い
      if (err?.statusCode === 404 || err?.error === 'NOT_FOUND') {
        return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
      }

      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'IDまたはパスワードが間違っています' }, { status: 401 });
    }

    const userRecord = records[0];
    const storedPassword = userRecord.get('password_hash') as string; 
    
    if (storedPassword !== password) {
      return NextResponse.json({ error: 'IDまたはパスワードが間違っています' }, { status: 401 });
    }

    const companies = userRecord.get('company') as string[];
    if (!companies || companies.length === 0) {
      return NextResponse.json({ error: '所属会社が設定されていません' }, { status: 403 });
    }
    const companyId = companies[0];

    // --- 修正箇所: roleが配列の場合の対応 ---
    let rawRole = userRecord.get('role');
    // 配列なら最初の要素を取得
    if (Array.isArray(rawRole)) {
      rawRole = rawRole[0];
    }
    const role = (rawRole as 'owner' | 'member' | 'admin') || 'member';
    // -------------------------------------

    const sessionToken = await signSession({ 
      userId: userRecord.id as string, 
      role,
      companyId
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
