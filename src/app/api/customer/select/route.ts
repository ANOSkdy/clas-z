import { NextRequest, NextResponse } from 'next/server';
import { getDataStore } from '@/lib/datastore';
import { getSession, signSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const store = getDataStore();

  try {
    const { companyId } = (await request.json()) as { companyId?: string };

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const userRecord = await store.getUserById(session.userId);
    const availableCompanyIds = userRecord?.companyIds ?? [];

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!availableCompanyIds.includes(companyId)) {
      return NextResponse.json({ error: 'Forbidden: company not accessible' }, { status: 403 });
    }

    const role = userRecord?.role || session.role;

    const sessionToken = await signSession({
      userId: session.userId,
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
    console.error('Switch company error:', error);
    return NextResponse.json({ error: 'Failed to switch company' }, { status: 500 });
  }
}
