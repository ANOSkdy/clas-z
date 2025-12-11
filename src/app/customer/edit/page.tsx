import CustomerForm from '@/components/pages/CustomerForm';
import { BackButton } from '@/components/ui/BackButton';

export default function CustomerEditPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 pb-10 sm:px-6">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6 text-slate-800">設定</h1>
      <CustomerForm />
    </div>
  );
}
