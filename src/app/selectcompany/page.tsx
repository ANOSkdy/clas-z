import Link from 'next/link';
import CustomerList from '@/components/pages/CustomerList';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';

export default function SelectCompanyPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <BackButton />
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
