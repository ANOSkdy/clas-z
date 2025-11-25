import { NextResponse } from 'next/server';
import { getSession, isAuthBypassEnabled } from '@/lib/auth';
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

    if (isAuthBypassEnabled()) {
      return NextResponse.json({
        alerts: [
          { id: 'demo-alert-1', title: '年末調整の申告期限が近づいています', type: 'warning', date: '2024-12-05' },
          { id: 'demo-alert-2', title: '社会保険料率が改定されました', type: 'info', date: '2024-11-30' }
        ],
        schedules: [
          { id: 'demo-schedule-1', title: '消費税申告', dueDate: '2024-12-10' },
          { id: 'demo-schedule-2', title: '給与支払報告書 提出', dueDate: '2025-01-20' },
          { id: 'demo-schedule-3', title: '決算書ドラフト共有', dueDate: '2025-02-05' }
        ]
      });
    }

    const base = getAirtableBase();
    if (!base) {
      console.error('[API] Airtable connection failed');
      return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });
    }

    // 1. 会社IDから会社名を取得
    let companyName = '';
    try {
      const companyRecord = await base('Companies').find(session.companyId);
      companyName = companyRecord.get('name') as string;
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
    return NextResponse.json({ alerts, schedules });

  } catch (error: unknown) {
    console.error('[API] Summary Critical Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 }
    );
  }
}
