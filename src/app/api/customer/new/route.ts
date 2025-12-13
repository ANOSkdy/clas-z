import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { customerSchema } from '@/lib/validation/customerSchema';
import { getSession } from '@/lib/auth';
import { getDataStore } from '@/lib/datastore';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const store = getDataStore();

  const userRole = Array.isArray(session.role) ? session.role[0] : session.role;
  if (userRole !== 'admin' && userRole !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: 作成権限がありません' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = customerSchema.parse(body);

    const companyId = await store.createCompanyForUser(session.userId, {
      type: validated.type,
      name: validated.name,
      corporateNumber: validated.corporateNumber || null,
      address: validated.address,
      representativeName: validated.representativeName,
      foundingDate: validated.foundingDate || null,
      fiscalYearEndMonth: validated.fiscalYearEndMonth,
      withholdingTaxType: validated.withholdingTaxType,
      residentTaxType: validated.residentTaxType,
      contactEmail: validated.contactEmail,
    });

    return NextResponse.json({ success: true, companyId });
  } catch (error) {
    console.error('Create company error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}
