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

  try {
    const records = await base('Schedules')
      .select({
        filterByFormula: `{company} = '${session.companyId}'`,
      })
      .firstPage();

    const schedules = records.map((record) => ({
      id: record.id,
      title: (record.get('title') as string) ?? '',
      dueDate: (record.get('due_date') as string) ?? '',
      status: (record.get('status') as string) ?? '',
      category: (record.get('category') as string) ?? '',
    }));

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Schedules fetch error:', error);
    return NextResponse.json({ error: 'Failed to load schedules' }, { status: 500 });
  }
}
