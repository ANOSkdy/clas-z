import NewCompanyForm from '@/components/pages/NewCompanyForm';
import { BackButton } from '@/components/ui/BackButton';

export default function NewCompanyPage() {
  return (
    <div className="container mx-auto max-w-2xl space-y-4 pb-10">
      <BackButton />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-800">会社・事業者の新規登録</h1>
        <p className="text-sm text-slate-600">
          新しい会社や個人事業主の基本情報を登録します。必須項目を入力のうえ「登録する」を押してください。
        </p>
      </div>
      <NewCompanyForm />
    </div>
  );
}
