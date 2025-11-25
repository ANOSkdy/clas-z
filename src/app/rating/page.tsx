import RatingUploadPanel from '@/components/pages/RatingUploadPanel';
import { BackButton } from '@/components/ui/BackButton';

export default function RatingPage() {
  return (
    <div className="container mx-auto">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6 text-slate-800">決算格付</h1>
      <RatingUploadPanel />
    </div>
  );
}
