import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-white rounded-lg border border-slate-200 shadow-sm p-4', className)}>
      {children}
    </div>
  );
}
