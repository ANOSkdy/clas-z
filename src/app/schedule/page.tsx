import ScheduleList from '@/components/pages/ScheduleList';
import { BackButton } from '@/components/ui/BackButton';

export default function SchedulePage() {
  return (
    <div className="container mx-auto">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6 text-slate-800">スケジュール</h1>
      <ScheduleList />
    </div>
  );
}
