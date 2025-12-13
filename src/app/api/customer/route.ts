import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDataStore } from '@/lib/datastore';
import { customerSchema } from '@/lib/validation/customerSchema';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const store = getDataStore();

  try {
    const record = await store.getCompanyById(session.companyId);

    if (!record) {
      return NextResponse.json({ error: 'Company record not found' }, { status: 404 });
    }

    const data = {
      type: record.type || 'corporation',
      name: record.name,
      corporateNumber: record.corporateNumber,
      address: record.address,
      representativeName: record.representativeName,
      foundingDate: record.foundingDate,
      fiscalYearEndMonth: record.fiscalYearEndMonth,
      withholdingTaxType: record.withholdingTaxType,
      residentTaxType: record.residentTaxType,
      contactEmail: record.contactEmail,
      currentUserRole: session.role
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch company error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // --- 修正箇所: 配列・文字列両対応の権限チェック ---
  const userRole = Array.isArray(session.role) ? session.role[0] : session.role;
  
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: 編集権限がありません' }, { status: 403 });
  }
  // ------------------------------------------------

  const store = getDataStore();

  try {
    const body = await request.json();
    const validatedData = customerSchema.parse(body);
    const companyId = session.companyId;

    const updateFields = {
      type: validatedData.type,
      name: validatedData.name,
      corporateNumber: validatedData.corporateNumber || null,
      address: validatedData.address,
      representativeName: validatedData.representativeName,
      foundingDate: validatedData.foundingDate || null,
      fiscalYearEndMonth: validatedData.fiscalYearEndMonth,
      withholdingTaxType: validatedData.withholdingTaxType,
      residentTaxType: validatedData.residentTaxType,
      contactEmail: validatedData.contactEmail
    };

    await store.updateCompany(companyId, updateFields);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update company error:', error);
    return NextResponse.json({ error: 'Validation or DB failed' }, { status: 400 });
  }
}
