import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { customerSchema } from '@/lib/validation/customerSchema';
import { getAirtableBase } from '@/lib/airtable';
import { ZodError } from 'zod';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const base = getAirtableBase();
  if (!base) {
    return NextResponse.json({ error: 'Airtable is not configured' }, { status: 500 });
  }

  try {
    const companyRecord = await base('Companies').find(session.companyId);
    const fields = companyRecord.fields;

    return NextResponse.json({
      name: (fields.name as string) ?? '',
      corporateNumber: (fields.corporate_number as string) ?? '',
      address: (fields.address as string) ?? '',
      representativeName: (fields.representativeName as string) ?? '',
      fiscalYearEndMonth: (fields.fiscalYearEndMonth as number) ?? 1,
      withholdingTaxType: (fields.withholdingTaxType as string) ?? 'monthly',
      residentTaxType: (fields.residentTaxType as string) ?? 'monthly',
      contactEmail: (fields.contactEmail as string) ?? '',
    });
  } catch (error) {
    console.error('Airtable fetch error:', error);
    return NextResponse.json({ error: 'Failed to load customer' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const base = getAirtableBase();
  if (!base) {
    return NextResponse.json({ error: 'Airtable is not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const validatedData = customerSchema.parse(body);

    const currentRecord = await base('Companies').find(session.companyId);
    const currentFields = currentRecord.fields;

    const updatePayload = {
      name: validatedData.name,
      corporate_number: validatedData.corporateNumber ?? '',
      address: validatedData.address,
      representativeName: validatedData.representativeName,
      fiscalYearEndMonth: validatedData.fiscalYearEndMonth,
      withholdingTaxType: validatedData.withholdingTaxType,
      residentTaxType: validatedData.residentTaxType,
      contactEmail: validatedData.contactEmail,
    } as const;

    const updatedRecord = await base('Companies').update(session.companyId, updatePayload);

    const registrationChanged =
      updatePayload.name !== (currentFields.name as string) ||
      updatePayload.address !== (currentFields.address as string) ||
      updatePayload.representativeName !== (currentFields.representativeName as string);

    if (registrationChanged) {
      await base('Alerts').create({
        title: '登記情報が変更されました',
        type: 'info',
        date: new Date().toISOString(),
        company: [session.companyId],
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        name: (updatedRecord.get('name') as string) ?? '',
        corporateNumber: (updatedRecord.get('corporate_number') as string) ?? '',
        address: (updatedRecord.get('address') as string) ?? '',
        representativeName: (updatedRecord.get('representativeName') as string) ?? '',
        fiscalYearEndMonth: (updatedRecord.get('fiscalYearEndMonth') as number) ?? 1,
        withholdingTaxType: (updatedRecord.get('withholdingTaxType') as string) ?? 'monthly',
        residentTaxType: (updatedRecord.get('residentTaxType') as string) ?? 'monthly',
        contactEmail: (updatedRecord.get('contactEmail') as string) ?? '',
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }
    console.error('Customer update error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}
