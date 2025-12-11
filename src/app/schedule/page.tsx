import ScheduleList from '@/components/pages/ScheduleList';
import { BackButton } from '@/components/ui/BackButton';

export default function SchedulePage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-3 pb-8 sm:px-4">
      <BackButton />
      <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">スケジュール</h1>
      <ScheduleList />
    </div>
  );
}
