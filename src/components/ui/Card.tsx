import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'card-hoverable glass-card rounded-xl border border-[rgba(17,17,17,0.06)] bg-white p-5 shadow-[0_12px_40px_-18px_rgba(108,78,108,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary-plum-700)]',
        className
      )}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
