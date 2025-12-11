import ManualView from '@/components/pages/ManualView';
import { BackButton } from '@/components/ui/BackButton';

export default function ManualPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-3 pb-8 sm:px-4">
      <BackButton />
      <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">手続きマニュアル</h1>
      <ManualView />
    </div>
  );
}
