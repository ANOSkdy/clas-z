import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAirtableBase } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('[API] /api/schedule/list: Request received');

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const base = getAirtableBase();
    if (!base) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

    // 1. 会社名取得
    let companyName = '';
    try {
      const companyRecord = await base('Companies').find(session.companyId);
      companyName = companyRecord.get('name') as string;
    } catch (e) {
      console.error('[API] Company Not Found (Schedule):', e);
      return NextResponse.json({ error: 'Company record not found' }, { status: 404 });
    }

    // 2. スケジュール検索
    const records = await base('Schedules').select({
      filterByFormula: `{company} = '${companyName}'`,
      sort: [{ field: 'due_date', direction: 'asc' }]
    }).all();

    const schedules = records.map(rec => ({
      id: rec.id,
      title: rec.get('title'),
      dueDate: rec.get('due_date'),
      status: rec.get('status') || 'pending',
      category: rec.get('category') || 'tax'
    }));

    return NextResponse.json(schedules);

  } catch (error: unknown) {
    console.error('[API] Schedule Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 }
    );
  }
}
