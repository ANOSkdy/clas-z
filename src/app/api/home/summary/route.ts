import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDataStore } from '@/lib/datastore';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[API] /api/home/summary: Request received');

  try {
    const session = await getSession();
    if (!session) {
      console.log('[API] Unauthorized: No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = getDataStore();
    const company = await store.getCompanyById(session.companyId);

    if (!company) {
      console.error('[API] Company Not Found:', { companyId: session.companyId });
      return NextResponse.json({ error: 'Company record not found' }, { status: 404 });
    }

    const [alerts, schedules] = await Promise.all([
      store.listAlertsByCompanyId(session.companyId, { limit: 5, unreadOnly: true }),
      store.listSchedulesByCompanyId(session.companyId, { limit: 5, pendingOnly: true }),
    ]);

    const companyName = company.name ?? '';
    const companyType = company.type || 'corporation';

    const mappedAlerts = alerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      type: alert.type || 'info',
      date: alert.createdAt,
    }));

    const mappedSchedules = schedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      dueDate: schedule.dueDate,
    }));

    console.log('[API] Home Summary Success. Alerts:', alerts.length, 'Schedules:', schedules.length);
    return NextResponse.json({
      alerts: mappedAlerts,
      schedules: mappedSchedules,
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
