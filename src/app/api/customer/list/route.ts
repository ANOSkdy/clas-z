import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAirtableBase } from '@/lib/airtable';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const base = getAirtableBase();
  if (!base) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

  try {
    const userRecord = await base('Users').find(session.userId);
    const companyIds = (userRecord.get('company') as string[] | undefined) ?? [];

    const companies = await Promise.all(
      companyIds.map(async (companyId) => {
        try {
          const record = await base('Companies').find(companyId);
          return {
            id: companyId,
            type: (record.get('type') as string) || 'corporation',
            name: (record.get('name') as string) ?? '名称未設定',
            representativeName: (record.get('representative_name') as string) ?? '',
            corporateNumber: (record.get('corporate_number') as string) ?? '',
            address: (record.get('address') as string) ?? '',
            contactEmail: (record.get('contact_email') as string) ?? '',
            isCurrent: companyId === session.companyId,
          };
        } catch (error) {
          console.error('Fetch company from list error:', { companyId, error });
          return null;
        }
      })
    );

    return NextResponse.json({ companies: companies.filter(Boolean) });
  } catch (error) {
    console.error('Fetch user companies error:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}
