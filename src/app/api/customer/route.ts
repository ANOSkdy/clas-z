import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAuthBypassEnabled } from '@/lib/auth';
import { getAirtableBase } from '@/lib/airtable';
import { customerSchema } from '@/lib/validation/customerSchema';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isAuthBypassEnabled()) {
    return NextResponse.json({
      type: 'corporation',
      name: 'クラズ合同会社（デモ）',
      corporateNumber: '0000000000000',
      address: '東京都渋谷区渋谷1-1-1',
      representativeName: '山田 太郎',
      foundingDate: '2020-04-01',
      fiscalYearEndMonth: '3',
      withholdingTaxType: 'general',
      residentTaxType: 'regular',
      contactEmail: 'demo@example.com',
      currentUserRole: session.role
    });
  }

  const base = getAirtableBase();
  if (!base) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

  try {
    const record = await base('Companies').find(session.companyId);
    
    const data = {
      type: record.get('type') || 'corporation',
      name: record.get('name'),
      corporateNumber: record.get('corporate_number'),
      address: record.get('address'),
      representativeName: record.get('representative_name'),
      foundingDate: record.get('founding_date'),
      fiscalYearEndMonth: record.get('fiscal_year_end_month'),
      withholdingTaxType: record.get('withholding_tax_type'),
      residentTaxType: record.get('resident_tax_type'),
      contactEmail: record.get('contact_email'),
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

  if (isAuthBypassEnabled()) {
    return NextResponse.json({ success: true, mode: 'bypass' });
  }

  // --- 修正箇所: 配列・文字列両対応の権限チェック ---
  const userRole = Array.isArray(session.role) ? session.role[0] : session.role;
  
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: 編集権限がありません' }, { status: 403 });
  }
  // ------------------------------------------------

  const base = getAirtableBase();
  if (!base) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

  try {
    const body = await request.json();
    const validatedData = customerSchema.parse(body);
    const companyId = session.companyId;
    
    const updateFields = {
      type: validatedData.type,
      name: validatedData.name,
      corporate_number: validatedData.corporateNumber,
      address: validatedData.address,
      representative_name: validatedData.representativeName,
      founding_date: validatedData.foundingDate,
      fiscal_year_end_month: validatedData.fiscalYearEndMonth,
      withholding_tax_type: validatedData.withholdingTaxType,
      resident_tax_type: validatedData.residentTaxType,
      contact_email: validatedData.contactEmail
    };

    await base('Companies').update(companyId, updateFields);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update company error:', error);
    return NextResponse.json({ error: 'Validation or DB failed' }, { status: 400 });
  }
}
