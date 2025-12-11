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

  // ログイン済みかつルート(/)またはログイン画面へのアクセス -> ホームへ
  if (session && (path === '/' || path === '/login')) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // /customer/edit へは /customer からのみ遷移可能に制限
  if (path === '/customer/edit') {
    const referer = request.headers.get('referer');
    const origin = request.nextUrl.origin;
    const customerEntry = `${origin}/customer`;

    if (!referer || !referer.startsWith(customerEntry)) {
      return NextResponse.redirect(new URL('/customer', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
