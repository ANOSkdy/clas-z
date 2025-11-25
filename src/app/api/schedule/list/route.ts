import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Mock Data: 将来は ScheduleItems テーブルから取得
  // クエリパラメータ (from, to, type) を処理するロジックをここに書く
  const mockSchedules = [
    { id: '1', title: 'Withholding Tax Payment (Oct)', dueDate: '2025-11-10', status: 'done', category: 'tax' },
    { id: '2', title: 'Consumption Tax Interim', dueDate: '2025-11-30', status: 'pending', category: 'tax' },
    { id: '3', title: 'Social Insurance Premium', dueDate: '2025-11-30', status: 'pending', category: 'social' },
    { id: '4', title: 'Year-end Adjustment Docs', dueDate: '2025-12-10', status: 'pending', category: 'tax' },
  ];

  return NextResponse.json(mockSchedules);
}
