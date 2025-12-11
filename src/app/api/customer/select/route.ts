import { NextRequest, NextResponse } from 'next/server';
import { getAirtableBase } from '@/lib/airtable';
import { getSession, signSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const base = getAirtableBase();
  if (!base) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

  try {
    const { companyId } = (await request.json()) as { companyId?: string };

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const userRecord = await base('Users').find(session.userId);
    const availableCompanyIds = (userRecord.get('company') as string[] | undefined) ?? [];

    if (!availableCompanyIds.includes(companyId)) {
      return NextResponse.json({ error: 'Forbidden: company not accessible' }, { status: 403 });
    }

    let rawRole = userRecord.get('role');
    if (Array.isArray(rawRole)) {
      rawRole = rawRole[0];
    }
    const role = (rawRole as 'owner' | 'member' | 'admin') || session.role;

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
