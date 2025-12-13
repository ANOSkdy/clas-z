import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/auth';
import { getDataStore } from '@/lib/datastore';

export async function POST(request: NextRequest) {
  try {
    const { loginId, password } = await request.json();

    if (!loginId || !password) {
      return NextResponse.json({ error: 'IDとパスワードを入力してください' }, { status: 400 });
    }

    const store = getDataStore();
    const userRecord = await store.getUserByLoginId(loginId);

    if (!userRecord) {
      return NextResponse.json({ error: 'IDまたはパスワードが間違っています' }, { status: 401 });
    }

    const storedPassword = userRecord.passwordHash;

    if (storedPassword !== password) {
      return NextResponse.json({ error: 'IDまたはパスワードが間違っています' }, { status: 401 });
    }

    const companies = userRecord.companyIds;
    if (!companies || companies.length === 0) {
      return NextResponse.json({ error: '所属会社が設定されていません' }, { status: 403 });
    }
    const companyId = companies[0];

    const role = userRecord.role;

    const sessionToken = await signSession({
      userId: userRecord.id,
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
