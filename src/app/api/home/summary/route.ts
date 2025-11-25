import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAirtableBase } from '@/lib/airtable';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const base = getAirtableBase();
  if (!base) {
    return NextResponse.json({ error: 'Airtable is not configured' }, { status: 500 });
  }
  const alertsTable = process.env.AIRTABLE_TABLE_ALERTS || 'Alerts';
  const schedulesTable = process.env.AIRTABLE_TABLE_SCHEDULES || 'Schedules';

  try {
    const [alertsRecords, scheduleRecords] = await Promise.all([
      base(alertsTable)
        .select({
          filterByFormula: `TRIM({company}) = '${session.companyId}'`,
          sort: [{ field: 'date', direction: 'desc' }],
          maxRecords: 5,
        })
        .firstPage(),
      base(schedulesTable)
        .select({
          filterByFormula: `TRIM({company}) = '${session.companyId}'`,
          sort: [{ field: 'due_date', direction: 'asc' }],
          maxRecords: 5,
        })
        .firstPage(),
    ]);

    const alerts = alertsRecords
      .filter((record) => {
        const isRead = record.get('is_read') as boolean | undefined;
        return !isRead;
      })
      .map((record) => ({
        id: record.id,
        title: (record.get('title') as string) ?? '',
        type: (record.get('type') as string) ?? '',
        date: (record.get('date') as string) ?? '',
      }));

    const schedules = scheduleRecords.map((record) => ({
      id: record.id,
      title: (record.get('title') as string) ?? '',
      dueDate: (record.get('due_date') as string) ?? '',
    }));

    return NextResponse.json({ alerts, schedules });
  } catch (error) {
    console.error('Home summary fetch error:', error);
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 });
  }
}
