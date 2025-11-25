import ManualView from '@/components/pages/ManualView';
import { BackButton } from '@/components/ui/BackButton';

export default function ManualPage() {
  return (
    <div className="container mx-auto">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6 text-slate-800">手続きマニュアル</h1>
      <ManualView />
    </div>
  );
}
