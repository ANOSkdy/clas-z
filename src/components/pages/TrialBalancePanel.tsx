'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function TrialBalancePanel() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    // Rating用のアップロードAPIを流用
    const res = await fetch('/api/rating/upload', { method: 'POST', body: formData });
    if (res.ok) {
      const data = await res.json();
      setFileId(data.fileId);
    }
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
          attachmentFileId: fileId
        })
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
      <Card>
        <h3 className="font-bold text-slate-800 mb-4">1. 試算表アップロード (CSV/PDF)</h3>
        <input type="file" onChange={handleUpload} className="block w-full text-sm text-slate-500" />
        {fileId && <p className="text-green-600 text-sm mt-2 font-bold">アップロード完了 (ID: {fileId})</p>}
      </Card>

      {fileId && (
        <Card>
          <h3 className="font-bold text-slate-800 mb-4">2. メールで共有</h3>
          {!emailOpen ? (
            <Button 
              onClick={() => setEmailOpen(true)}
              variant="secondary"
            >
              メール作成
            </Button>
          ) : (
            <div className="space-y-4">
              <Button 
                onClick={() => setEmailOpen(false)}
                variant="ghost"
                size="sm"
                className="mb-2"
              >
                閉じる
              </Button>
              <form onSubmit={sendMail} className="space-y-4">
                <Input label="宛先 (To)" name="to" type="email" required placeholder="accountant@example.com" />
                
                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
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
