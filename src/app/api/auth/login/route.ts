import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/auth';
import { getAirtableBase } from '@/lib/airtable';

export async function POST(request: NextRequest) {
  try {
    const { loginId, password } = await request.json();

    // 1. バリデーション
    if (!loginId || !password) {
      return NextResponse.json({ error: 'ID and Password are required' }, { status: 400 });
    }

    const base = getAirtableBase();
    if (!base) {
      return NextResponse.json({ error: 'Airtable is not configured' }, { status: 500 });
    }

    const usersTable = process.env.AIRTABLE_TABLE_USERS || 'Users';
    // 2. 認証ロジック: Airtable Users テーブルで login_id を検索
    const escapedLoginId = String(loginId).replace(/"/g, '\\"');

    const records = await base(usersTable)
      .select({
        filterByFormula: `{login_id} = "${escapedLoginId}"`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const userRecord = records[0];
    const storedPassword =
      (userRecord.get('password_hash') as string | undefined) ||
      (userRecord.get('password') as string | undefined);

    // 簡易的に平文チェック
    if (!storedPassword || storedPassword !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const role = (userRecord.get('role') as 'owner' | 'member' | 'admin') || 'member';
    const companyLink = userRecord.get('company') as string[] | undefined;
    const companyId = companyLink?.[0];

    if (!companyId) {
      return NextResponse.json({ error: 'Company is not linked to the user' }, { status: 500 });
    }

    const user = { id: userRecord.id, role, companyId };

    // 3. セッション発行
    const sessionToken = await signSession({ userId: user.id as string, role, companyId });

    // 4. Cookie 設定 (HTTP Only)
    const response = NextResponse.json({ success: true });
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 30, // 30分
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    const airtableError = error as { statusCode?: number; message?: string };
    if (airtableError?.statusCode === 404) {
      return NextResponse.json(
        {
          error: 'Airtable table not found. Check AIRTABLE_BASE_ID and table name (Users).',
          detail: airtableError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
