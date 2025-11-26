import * as React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary:
        'bg-[var(--color-primary-plum-700)] text-white shadow-[0_12px_24px_rgba(144,104,144,0.35)] hover:bg-[var(--color-primary-plum-800)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-plum-500)]',
      secondary:
        'bg-[var(--color-primary-salmon-700)] text-white shadow-[0_10px_24px_rgba(175,93,93,0.28)] hover:bg-[var(--color-primary-salmon-800)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-salmon-500)]',
      outline:
        'border border-[rgba(144,104,144,0.35)] text-[var(--color-text)] bg-white/70 hover:bg-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary-plum-700)]',
      ghost: 'text-[var(--color-primary-plum-800)] hover:bg-[rgba(144,104,144,0.08)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary-plum-700)]',
      danger: 'bg-[var(--color-danger)] text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-300',
    };

    const sizes = {
      sm: 'h-9 px-3 text-xs',
      md: 'h-11 px-4 text-sm', // 44px for touch targets
      lg: 'h-14 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-semibold transition-[transform,box-shadow,background-color] duration-200 ease-[var(--motion-easing-standard)]',
          'focus-visible:outline-none disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed active:scale-[0.99]',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="-ml-1 mr-2 h-4 w-4 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
