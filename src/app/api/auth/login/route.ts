import type { FieldSet, Record as AirtableRecord } from 'airtable';
import { NextRequest, NextResponse } from 'next/server';
import { getBypassSession, isAuthBypassEnabled, signSession } from '@/lib/auth';
import { getAirtableBase } from '@/lib/airtable';

interface UserFields extends FieldSet {
  login_id?: string;
  password_hash?: string;
  company?: string[];
  role?: string | string[];
}

export async function POST(request: NextRequest) {
  try {
    const { loginId, password } = await request.json();

    if (isAuthBypassEnabled()) {
      const bypassSession = getBypassSession();
      if (bypassSession) {
        const { expiresAt, ...payload } = bypassSession;
        const sessionToken = await signSession(payload);
        const response = NextResponse.json({ success: true, mode: 'bypass' });
        response.cookies.set('session', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60,
        });
        return response;
      }
    }

    if (!loginId || !password) {
      return NextResponse.json({ error: 'IDとパスワードを入力してください' }, { status: 400 });
    }

    const base = getAirtableBase();
    if (!base) {
      console.error('Airtable connection failed');
      return NextResponse.json({ error: 'システムエラー: DB未接続' }, { status: 500 });
    }

    let records: AirtableRecord<UserFields>[] = [];
    try {
      const fetchedRecords = await base<UserFields>('Users')
        .select({
          filterByFormula: `{login_id} = '${loginId}'`,
          maxRecords: 1,
        })
        .firstPage();
      records = [...fetchedRecords];
    } catch (err: unknown) {
      console.error('[Login] Airtable query failed:', err);

      const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err ? (err as { statusCode?: number }).statusCode : undefined;
      const errorCode = typeof err === 'object' && err !== null && 'error' in err ? (err as { error?: string }).error : undefined;

      if (statusCode === 404 || errorCode === 'NOT_FOUND') {
        return NextResponse.json(
          {
            error: 'ユーザーテーブルにアクセスできません。Airtable の Base ID とテーブル名（Users）を確認してください。',
          },
          { status: 500 }
        );
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
      companyId,
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
