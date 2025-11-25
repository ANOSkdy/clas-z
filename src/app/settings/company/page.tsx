'use client';

import CustomerForm from '@/components/pages/CustomerForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BackButton } from '@/components/ui/BackButton';

export default function CompanySettingsPage() {
  const handleDelete = () => {
    if (confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
      alert('アカウント削除を受け付けました。(デモ)');
    }
  };

  return (
    <div className="container mx-auto max-w-2xl pb-10 space-y-8">
      <BackButton />
      <h1 className="text-2xl font-bold text-slate-800">設定</h1>
      
      {/* 基本情報編集フォーム */}
      <CustomerForm />

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50">
        <h3 className="text-red-800 font-bold mb-2">アカウント削除</h3>
        <p className="text-sm text-red-600 mb-4">
          アカウントを削除すると、すべてのデータが完全に削除され、元に戻すことはできません。
        </p>
        <Button 
          variant="danger"
          onClick={handleDelete}
        >
          アカウントを削除する
        </Button>
      </Card>
    </div>
  );
}
