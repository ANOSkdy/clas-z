import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDataStore } from '@/lib/datastore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = getDataStore();
    const sections = await store.listManualSections(session.companyId);

    return NextResponse.json({ sections });
  } catch (error: unknown) {
    console.error('[API] Manual sections error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load manual sections', details: message },
      { status: 500 }
    );
  }
}
