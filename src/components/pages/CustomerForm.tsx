'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema } from '@/lib/validation/customerSchema';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

type CustomerFormValues = z.input<typeof customerSchema>;

export default function CustomerForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      type: 'corporation',
      fiscalYearEndMonth: 3,
      withholdingTaxType: 'monthly',
      residentTaxType: 'monthly'
    }
  });

  const currentType = watch('type');
  const foundingDate = watch('foundingDate');
  const rawFiscalMonth = watch('fiscalYearEndMonth');
  const fiscalMonth = rawFiscalMonth !== undefined && rawFiscalMonth !== null
    ? Number(rawFiscalMonth)
    : null;

  useEffect(() => {
    fetch('/api/customer')
      .then((res) => res.json())
      .then((data) => {
        // --- 修正箇所: 配列・文字列両対応 ---
        const role = data.currentUserRole;
        const isAdminUser = Array.isArray(role)
          ? role.includes('admin')
          : role === 'admin';

        setIsAdmin(isAdminUser);
        // ----------------------------------

        reset({ ...data, type: data.type || 'corporation' });
        setLoading(false);
      });
  }, [reset]);

  useEffect(() => {
    if (isAdmin && currentType === 'individual') {
      setValue('fiscalYearEndMonth', 12);
    }
  }, [currentType, setValue, isAdmin]);

  useEffect(() => {
    if (!foundingDate || fiscalMonth === null || Number.isNaN(fiscalMonth)) {
      setCurrentTerm(null);
      return;
    }
    try {
      const today = new Date();
      const founding = new Date(foundingDate);
      if (isNaN(founding.getTime())) {
        setCurrentTerm(null);
        return;
      }
      let firstTermEndYear = founding.getFullYear();
      if (founding.getMonth() + 1 > fiscalMonth) {
        firstTermEndYear += 1;
      }
      const firstTermEndDate = new Date(firstTermEndYear, fiscalMonth - 1, 31);

      if (today <= firstTermEndDate) {
        setCurrentTerm(1);
        return;
      }
      let currentFiscalEndYear = today.getFullYear();
      if (today.getMonth() + 1 > fiscalMonth) {
        currentFiscalEndYear += 1;
      }
      const term = (currentFiscalEndYear - firstTermEndYear) + 1;
      setCurrentTerm(term > 0 ? term : 1);
    } catch {
      setCurrentTerm(null);
    }
  }, [foundingDate, fiscalMonth]);

  const onSubmit = async (data: CustomerFormValues) => {
    if (!isAdmin) return;
    setSaving(true);
    const res = await fetch('/api/customer', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setSaving(false);

    if (res.ok) {
      alert('保存しました');
      router.refresh();
    } else {
      alert('エラー: 保存できませんでした');
    }
  };

  if (loading) return <div className="p-4 text-center text-slate-500">読み込み中...</div>;

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">基本情報</h2>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <span className="text-slate-500">事業形態</span>
              <Badge variant="outline">
                {currentType === 'individual' ? '個人事業主' : '企業'}
              </Badge>
            </div>
            {isAdmin && <Badge variant="warning">管理者編集モード</Badge>}
          </div>

          {currentTerm && (
            <Badge variant="success" className="text-sm px-3 py-1">
              現在: 第 {currentTerm} 期
            </Badge>
          )}
        </div>

        <input type="hidden" {...register('type')} readOnly />

        {currentType === 'individual' && isAdmin && (
          <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 border border-blue-100 mb-6">
            <span className="font-bold">ℹ️ 個人事業主設定:</span>
            <ul className="list-disc list-inside mt-1 ml-1 text-xs">
              <li>決算月は自動的に <strong>12月</strong> に設定されます。</li>
              <li>確定申告期限は <strong>3月15日</strong> としてスケジュール登録されます。</li>
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2">
            <Input
              label={currentType === 'corporation' ? "会社名" : "屋号 / 事業所名"}
              disabled={!isAdmin}
              {...register('name')}
              error={errors.name?.message}
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <Input
              label="所在地"
              disabled={!isAdmin}
              {...register('address')}
              error={errors.address?.message}
            />
          </div>

          {currentType === 'corporation' && (
            <Input
              label="法人番号 (13桁)"
              disabled={!isAdmin}
              {...register('corporateNumber')}
              error={errors.corporateNumber?.message}
            />
          )}

          <Input
            label="代表者名"
            disabled={!isAdmin}
            {...register('representativeName')}
            error={errors.representativeName?.message}
          />

          <Input
            type="date"
            label={currentType === 'corporation' ? "設立年月日" : "開業年月日"}
            disabled={!isAdmin}
            {...register('foundingDate')}
            error={errors.foundingDate?.message}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              決算月 {currentType === 'individual' && <Badge variant="outline" className="ml-2">12月固定</Badge>}
            </label>
            <select
              {...register('fiscalYearEndMonth')}
              disabled={!isAdmin || currentType === 'individual'}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 focus-ring disabled:bg-slate-100 disabled:text-slate-500"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1} 月</option>
              ))}
            </select>
          </div>

          <div className="col-span-1 md:col-span-2">
             <hr className="border-slate-100 my-2"/>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">源泉所得税 納付特例</label>
            <select
              {...register('withholdingTaxType')}
              disabled={!isAdmin}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 focus-ring disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="monthly">毎月納付</option>
              <option value="semiannual">納期特例 (年2回)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">住民税 納付特例</label>
            <select
              {...register('residentTaxType')}
              disabled={!isAdmin}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 focus-ring disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="monthly">毎月納付</option>
              <option value="semiannual">納期特例 (年2回)</option>
            </select>
          </div>

          <div className="col-span-1 md:col-span-2">
            <Input
              label="通知用メールアドレス"
              disabled={!isAdmin}
              {...register('contactEmail')}
              error={errors.contactEmail?.message}
            />
          </div>
        </div>

        {isAdmin && (
          <div className="pt-4 flex justify-end gap-3 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>キャンセル</Button>
            <Button type="submit" isLoading={saving}>保存する</Button>
          </div>
        )}

        {!isAdmin && (
           <div className="pt-4 flex justify-center border-t mt-4">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full">
              戻る
            </Button>
           </div>
        )}
      </form>
    </Card>
  );
}
