import TrialBalancePanel from '@/components/pages/TrialBalancePanel';
import { BackButton } from '@/components/ui/BackButton';

export default function TrialBalancePage() {
  return (
    <div className="container mx-auto">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6 text-slate-800">試算表</h1>
      <TrialBalancePanel />
    </div>
  );
}
