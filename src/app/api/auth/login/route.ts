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

    // 2. 認証ロジック
    // ※本来は Airtable の Users テーブルを検索し、パスワードハッシュを検証する
    // ※今回は開発用バックドアとして固定値を許可する
    let user = null;

    if (loginId === 'admin' && password === 'password') {
      user = { id: 'mock-admin-id', role: 'owner', name: 'Test Admin' };
    } else {
      // Airtable 検索ロジック (接続設定済みの場合のみ動作)
      const base = getAirtableBase();
      if (base) {
        const records = await base('Users').select({
          filterByFormula: `{login_id} = '${loginId}'`,
          maxRecords: 1
        }).firstPage();

        if (records.length > 0) {
            // TODO: 本番ではここでパスワードハッシュの検証を行う (Argon2など)
            // 今回は簡易的に平文チェック、またはパスワードフィールドなしで通す想定
            // const record = records[0];
            // if (record.get('password') === password) ...
            
            // 開発中はAirtableにレコードがあればOKとする（要修正）
            user = { id: records[0].id, role: records[0].get('role') || 'member' };
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 3. セッション発行
    // role は型定義に合わせて 'owner' | 'member' | 'admin' にキャスト
    const role = (user.role as 'owner' | 'member' | 'admin') || 'member';
    const sessionToken = await signSession({ userId: user.id as string, role });

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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
