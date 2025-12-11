"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerList from '@/components/pages/CustomerList';
import { Button } from '@/components/ui/Button';

export default function SelectCompanyPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="mb-2 pl-0 text-slate-500 hover:bg-transparent hover:text-blue-700"
        >
          <span>ログアウト</span>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">会社・事業者を選択</h1>
          <Link href="/newcompany">
            <Button size="sm" variant="secondary">
              新規登録
            </Button>
          </Link>
        </div>
      </div>
      <p className="text-sm text-slate-600">
        閲覧可能な会社や個人事業主の情報を一覧表示しています。ログイン後に利用する会社を選択してください。
      </p>
      <CustomerList />
    </div>
  );
}
