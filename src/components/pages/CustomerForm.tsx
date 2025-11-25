'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema, type CustomerSchema } from '@/lib/validation/customerSchema';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function CustomerForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerSchema>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    fetch('/api/customer')
      .then((res) => res.json())
      .then((data) => {
        reset(data);
        setLoading(false);
      });
  }, [reset]);

  const onSubmit = async (data: CustomerSchema) => {
    setSaving(true);
    await fetch('/api/customer', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setSaving(false);
    alert('保存しました');
    router.refresh();
  };

  if (loading) return <div className="p-4 text-center text-slate-500">読み込み中...</div>;

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="text-lg font-bold text-slate-800 border-b pb-2">会社基本情報</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2">
            <Input label="会社名" {...register('name')} error={errors.name?.message} />
          </div>

          <div className="col-span-1 md:col-span-2">
            <Input label="所在地" {...register('address')} error={errors.address?.message} />
          </div>

          <Input label="法人番号 (13桁)" {...register('corporateNumber')} error={errors.corporateNumber?.message} />
          <Input label="代表者名" {...register('representativeName')} error={errors.representativeName?.message} />
          <Input label="通知用メールアドレス" {...register('contactEmail')} error={errors.contactEmail?.message} />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">決算月</label>
            <select {...register('fiscalYearEndMonth')} className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 focus-ring">
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1} 月</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">源泉所得税 納付特例</label>
            <select {...register('withholdingTaxType')} className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 focus-ring">
              <option value="monthly">毎月納付</option>
              <option value="semiannual">納期特例 (年2回)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">住民税 納付特例</label>
            <select {...register('residentTaxType')} className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 focus-ring">
              <option value="monthly">毎月納付</option>
              <option value="semiannual">納期特例 (年2回)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>キャンセル</Button>
          <Button type="submit" isLoading={saving}>保存する</Button>
        </div>
      </form>
    </Card>
  );
}
