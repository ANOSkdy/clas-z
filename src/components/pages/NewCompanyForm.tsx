'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { customerSchema } from '@/lib/validation/customerSchema';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

type NewCompanyFormValues = z.input<typeof customerSchema>;

export default function NewCompanyForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewCompanyFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      type: 'corporation',
      fiscalYearEndMonth: 3,
      withholdingTaxType: 'monthly',
      residentTaxType: 'monthly',
    },
  });

  const currentType = watch('type');

  useEffect(() => {
    if (currentType === 'individual') {
      setValue('fiscalYearEndMonth', 12);
    }
  }, [currentType, setValue]);

  const onSubmit = async (data: NewCompanyFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = typeof result.error === 'string' ? result.error : '会社の登録に失敗しました';
        throw new Error(message);
      }

      router.push('/customer');
    } catch (err) {
      const message = err instanceof Error ? err.message : '会社の登録に失敗しました';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">新規会社・事業者の登録</h2>
            <Badge variant="outline">{currentType === 'individual' ? '個人事業主' : '法人'}</Badge>
          </div>
          <div className="space-y-1.5 text-right">
            <label className="block text-sm font-medium text-slate-700">事業形態</label>
            <select
              {...register('type')}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 focus-ring"
            >
              <option value="corporation">法人</option>
              <option value="individual">個人事業主</option>
            </select>
          </div>
        </div>

        {currentType === 'individual' && (
          <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 border border-blue-100">
            <span className="font-semibold">ℹ️ 個人事業主の場合:</span>
            <ul className="list-disc list-inside mt-1 text-xs text-blue-700">
              <li>決算月は自動的に 12 月に固定されます。</li>
              <li>法人番号の入力は不要です。</li>
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2">
            <Input
              label={currentType === 'corporation' ? '会社名' : '屋号 / 事業所名'}
              {...register('name')}
              error={errors.name?.message}
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <Input label="所在地" {...register('address')} error={errors.address?.message} />
          </div>

          {currentType === 'corporation' && (
            <Input
              label="法人番号 (13桁)"
              {...register('corporateNumber')}
              error={errors.corporateNumber?.message}
            />
          )}

          <Input label="代表者名" {...register('representativeName')} error={errors.representativeName?.message} />

          <Input
            type="date"
            label={currentType === 'corporation' ? '設立年月日' : '開業年月日'}
            {...register('foundingDate')}
            error={errors.foundingDate?.message}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              決算月 {currentType === 'individual' && <Badge variant="outline" className="ml-2">12月固定</Badge>}
            </label>
            <select
              {...register('fiscalYearEndMonth')}
              disabled={currentType === 'individual'}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 focus-ring disabled:bg-slate-100 disabled:text-slate-500"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} 月
                </option>
              ))}
            </select>
            {errors.fiscalYearEndMonth && (
              <p className="text-xs text-red-500 font-medium">{errors.fiscalYearEndMonth.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">源泉所得税 納付特例</label>
            <select
              {...register('withholdingTaxType')}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 focus-ring"
            >
              <option value="monthly">毎月納付</option>
              <option value="semiannual">納期特例 (年2回)</option>
            </select>
            {errors.withholdingTaxType && (
              <p className="text-xs text-red-500 font-medium">{errors.withholdingTaxType.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">住民税 納付特例</label>
            <select
              {...register('residentTaxType')}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 focus-ring"
            >
              <option value="monthly">毎月納付</option>
              <option value="semiannual">納期特例 (年2回)</option>
            </select>
            {errors.residentTaxType && (
              <p className="text-xs text-red-500 font-medium">{errors.residentTaxType.message}</p>
            )}
          </div>

          <div className="col-span-1 md:col-span-2">
            <Input label="通知用メールアドレス" {...register('contactEmail')} error={errors.contactEmail?.message} />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 font-medium" role="alert">
            {error}
          </p>
        )}

        <div className="pt-4 flex justify-end gap-3 border-t mt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            キャンセル
          </Button>
          <Button type="submit" isLoading={submitting}>
            登録する
          </Button>
        </div>
      </form>
    </Card>
  );
}
