import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { customerSchema } from '@/lib/validation/customerSchema';
import { getSession } from '@/lib/auth';
import { getAirtableBase } from '@/lib/airtable';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const base = getAirtableBase();
  if (!base) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

  const userRole = Array.isArray(session.role) ? session.role[0] : session.role;
  if (userRole !== 'admin' && userRole !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: 作成権限がありません' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = customerSchema.parse(body);

    const [record] = await base('Companies').create([
      {
        fields: {
          type: validated.type,
          name: validated.name,
          corporate_number: validated.corporateNumber || undefined,
          address: validated.address,
          representative_name: validated.representativeName,
          founding_date: validated.foundingDate || undefined,
          fiscal_year_end_month: validated.fiscalYearEndMonth,
          withholding_tax_type: validated.withholdingTaxType,
          resident_tax_type: validated.residentTaxType,
          contact_email: validated.contactEmail,
        },
      },
    ]);

    const userRecord = await base('Users').find(session.userId);
    const companies = (userRecord.get('company') as string[] | undefined) ?? [];

    if (!companies.includes(record.id)) {
      await base('Users').update(session.userId, {
        company: [...companies, record.id],
      });
    }

    return NextResponse.json({ success: true, companyId: record.id });
  } catch (error) {
    console.error('Create company error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}
