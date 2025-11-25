import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/auth';
import { getAirtableBase } from '@/lib/airtable';

export async function POST(request: NextRequest) {
  try {
    const { loginId, password } = await request.json();

    if (!loginId || !password) {
      return NextResponse.json({ error: 'IDとパスワードを入力してください' }, { status: 400 });
    }

    const base = getAirtableBase();
    if (!base) {
      console.error('Airtable connection failed');
      return NextResponse.json({ error: 'システムエラー: DB未接続' }, { status: 500 });
    }

    const records = await base('Users').select({
      filterByFormula: `{login_id} = '${loginId}'`,
      maxRecords: 1
    }).firstPage();

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
