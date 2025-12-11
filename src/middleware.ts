import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 公開ルート定義
  const publicPaths = ['/login', '/api/auth/login', '/api/auth/logout'];
  
  // 静的ファイルなどは除外
  if (path.startsWith('/_next') || path.includes('.')) {
    return NextResponse.next();
  }

  // セッションチェック
  const sessionCookie = request.cookies.get('session')?.value;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;

  // 未ログインかつ公開ルート以外へのアクセス -> ログインへリダイレクト
  if (!session && !publicPaths.includes(path) && path !== '/') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ログイン済みかつルート(/)またはログイン画面へのアクセス -> 会社選択へ
  if (session && (path === '/' || path === '/login')) {
    return NextResponse.redirect(new URL('/selectcompany', request.url));
  }

  // /customer/edit へは会社選択済みのユーザーのみ
  if (path === '/customer/edit' && !session?.companyId) {
    return NextResponse.redirect(new URL('/selectcompany', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
