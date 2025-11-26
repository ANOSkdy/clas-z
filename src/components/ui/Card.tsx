import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'surface-card rounded-xl border border-slate-200/70 p-4 transition-[transform,box-shadow,border-color] duration-200 ease-[var(--motion-easing-standard)]',
        'hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(17,24,39,0.08)] focus-within:shadow-[0_12px_36px_rgba(17,24,39,0.12)]',
        'focus-within:border-[var(--color-primary-plum-700)]',
        className
      )}
    >
      {children}
    </div>
  );
}
