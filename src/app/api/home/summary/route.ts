import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAirtableBase } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[API] /api/home/summary: Request received');

  try {
    const session = await getSession();
    if (!session) {
      console.log('[API] Unauthorized: No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base = getAirtableBase();
    if (!base) {
      console.error('[API] Airtable connection failed');
      return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });
    }

    // 1. 会社IDから会社名を取得
    let companyName = '';
    let companyType = '';
    try {
      const companyRecord = await base('Companies').find(session.companyId);
      companyName = companyRecord.get('name') as string;
      companyType = (companyRecord.get('type') as string) || 'corporation';
    } catch (e) {
      console.error('[API] Company Not Found:', e);
      return NextResponse.json({ error: 'Company record not found' }, { status: 404 });
    }

    // 2. 未読アラート取得
    const alertRecords = await base('Alerts').select({
      filterByFormula: `AND({company} = '${companyName}', {is_read} != 'true')`,
      sort: [{ field: 'created_at', direction: 'desc' }],
      maxRecords: 5
    }).all();

    const alerts = alertRecords.map(rec => ({
      id: rec.id,
      title: rec.get('title'),
      type: rec.get('type') || 'info',
      date: rec.get('created_at')
    }));

    // 3. 直近スケジュール取得
    const scheduleRecords = await base('Schedules').select({
      filterByFormula: `AND({company} = '${companyName}', {status} != 'done')`,
      sort: [{ field: 'due_date', direction: 'asc' }],
      maxRecords: 5
    }).all();

    const schedules = scheduleRecords.map(rec => ({
      id: rec.id,
      title: rec.get('title'),
      dueDate: rec.get('due_date')
    }));

    console.log('[API] Home Summary Success. Alerts:', alerts.length, 'Schedules:', schedules.length);
    return NextResponse.json({
      alerts,
      schedules,
      company: { name: companyName, type: companyType },
    });

  } catch (error: any) {
    console.error('[API] Summary Critical Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
