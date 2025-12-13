import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDataStore } from '@/lib/datastore';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const store = getDataStore();

  try {
    const companies = await store.listCompaniesByUserId(session.userId);

    return NextResponse.json({
      companies: companies.map((record) => ({
        id: record.id,
        type: record.type || 'corporation',
        name: record.name ?? '名称未設定',
        representativeName: record.representativeName ?? '',
        corporateNumber: record.corporateNumber ?? '',
        address: record.address ?? '',
        contactEmail: record.contactEmail ?? '',
        isCurrent: record.id === session.companyId,
      })),
    });
  } catch (error) {
    console.error('Fetch user companies error:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}
