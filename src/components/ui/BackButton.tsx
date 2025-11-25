'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function BackButton() {
  const router = useRouter();
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => router.back()} 
      className="mb-2 pl-0 hover:bg-transparent hover:text-blue-700 text-slate-500 gap-1"
    >
      <span>←</span>
      <span>戻る</span>
    </Button>
  );
}
