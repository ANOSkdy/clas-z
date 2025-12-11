'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export type CustomerListItem = {
  id: string;
  type: 'corporation' | 'individual' | string;
  name: string;
  representativeName?: string;
  corporateNumber?: string;
  address?: string;
  contactEmail?: string;
  isCurrent?: boolean;
};

export default function CustomerList() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/customer/list')
      .then((res) => {
        if (!res.ok) throw new Error('一覧の取得に失敗しました');
        return res.json();
      })
      .then((data) => {
        setCompanies(data.companies || []);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : '一覧の取得に失敗しました';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleOpen = async (companyId: string) => {
    setError(null);
    setSelectingId(companyId);
    try {
      const res = await fetch('/api/customer/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      if (!res.ok) {
        throw new Error('会社の切り替えに失敗しました');
      }

      router.push('/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : '会社の切り替えに失敗しました';
      setError(message);
    } finally {
      setSelectingId(null);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-slate-500">読み込み中...</div>;
  }

  if (error) {
    return (
      <Card className="p-4 text-center text-red-600 border-red-200 bg-red-50">
        {error}
      </Card>
    );
  }

  if (companies.length === 0) {
    return (
      <Card className="p-6 text-center text-slate-600">
        閲覧可能な会社・事業者が登録されていません。
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {companies.map((company) => (
        <Card key={company.id} className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">
                  {company.type === 'individual' ? '個人事業主' : '法人'}
                </Badge>
                <h3 className="text-lg font-bold text-slate-800 leading-snug">{company.name}</h3>
              </div>
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              onClick={() => handleOpen(company.id)}
              disabled={selectingId === company.id}
            >
              {selectingId === company.id ? '切り替え中...' : '詳細を開く'}
            </Button>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-700">
            <div className="flex gap-2">
              <dt className="font-semibold text-slate-600">代表者</dt>
              <dd>{company.representativeName || '未設定'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold text-slate-600">連絡先</dt>
              <dd>{company.contactEmail || '未設定'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold text-slate-600">所在地</dt>
              <dd>{company.address || '未設定'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold text-slate-600">番号</dt>
              <dd>{company.corporateNumber || '―'}</dd>
            </div>
          </dl>
        </Card>
      ))}
    </div>
  );
}
