import CustomerList from '@/components/pages/CustomerList';
import { BackButton } from '@/components/ui/BackButton';

export default function CustomerPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-2xl font-bold text-slate-800">会社・事業者一覧</h1>
      </div>
      <p className="text-sm text-slate-600">
        閲覧可能な会社や個人事業主の情報を一覧表示しています。編集に進む前に、対象の事業者を確認してください。
      </p>
      <CustomerList />
    </div>
  );
}
