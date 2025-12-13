import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDataStore } from '@/lib/datastore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('[API] /api/schedule/list: Request received');

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = getDataStore();
    const schedules = await store.listSchedulesByCompanyId(session.companyId, { pendingOnly: true });

    return NextResponse.json(schedules);

  } catch (error: any) {
    console.error('[API] Schedule Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
