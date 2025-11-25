'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function TrialBalancePanel() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    // Rating用のアップロードAPIを流用
    const res = await fetch('/api/rating/upload', { method: 'POST', body: formData });
    if (res.ok) {
      const data = await res.json();
      setFileId(data.fileId);
    }
    setUploading(false);
  };

  const sendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileId) return;
    setLoading(true);

    try {
      const form = e.target as HTMLFormElement;
      const to = (form.elements.namedItem('to') as HTMLInputElement).value;

      await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: '試算表のご送付',
          body: '試算表を添付にてお送りいたします。ご確認ください。',
          attachmentFileId: fileId,
        }),
      });

      alert('送信しました！');
      setEmailOpen(false);
    } catch {
      alert('送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(144,104,144,0.1)] text-xl">📑</div>
          <div>
            <h3 className="font-bold text-slate-900">1. 試算表アップロード (CSV/PDF)</h3>
            <p className="text-sm text-slate-600">ドラッグ&ドロップ、または下記からファイルを選択してください。</p>
          </div>
        </div>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(17,17,17,0.12)] bg-[rgba(144,104,144,0.03)] p-5 text-sm text-slate-700 transition-colors hover:border-[var(--color-primary-plum-700)]">
          <span className="text-base font-semibold text-slate-900">ファイルを選択</span>
          <span className="text-xs text-slate-500">PDF または CSV (最大 4MB)</span>
          <input type="file" onChange={handleUpload} className="sr-only" />
        </label>
        {uploading && <Skeleton className="h-5 w-28" />}
        {fileId && <p className="text-[var(--color-success)] text-sm font-bold">アップロード完了 (ID: {fileId})</p>}
      </Card>

      {fileId && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">2. メールで共有</h3>
              <p className="text-sm text-slate-600">宛先を入力してワンタップ送信</p>
            </div>
            {!emailOpen && (
              <Button onClick={() => setEmailOpen(true)} variant="secondary">
                メール作成
              </Button>
            )}
          </div>
          {emailOpen && (
            <div className="space-y-4">
              <Button onClick={() => setEmailOpen(false)} variant="ghost" size="sm" className="mb-2">
                閉じる
              </Button>
              <form onSubmit={sendMail} className="space-y-4">
                <Input label="宛先 (To)" name="to" type="email" required placeholder="accountant@example.com" />

                <div className="text-xs text-slate-600 rounded-lg bg-slate-50 p-3">
                  添付ファイル: TrialBalance.pdf (Google Driveより)
                </div>

                <Button type="submit" isLoading={loading} className="w-full">
                  送信する
                </Button>
              </form>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
