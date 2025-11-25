import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { customerSchema } from '@/lib/validation/customerSchema';

// Mock Data (Airtable未接続時用)
let mockCustomerDB = {
  name: 'ACME Corp',
  corporateNumber: '1234567890123',
  address: '1-1-1 Tech Valley, Tokyo',
  representativeName: 'John Doe',
  fiscalYearEndMonth: 3,
  withholdingTaxType: 'monthly',
  residentTaxType: 'monthly',
  contactEmail: 'admin@example.com',
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 本来は Airtable から session.userId に紐づく Company を取得
  return NextResponse.json(mockCustomerDB);
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const validatedData = customerSchema.parse(body);

    // TODO: Airtable 更新処理
    // TODO: 登記事項(name, address, rep)変更時のアラート作成ロジック

    // Mock DB 更新
    mockCustomerDB = { ...mockCustomerDB, ...validatedData };

    return NextResponse.json({ success: true, data: mockCustomerDB });
  } catch (error) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }
}
