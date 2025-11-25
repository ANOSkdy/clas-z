import * as React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-gradient-to-r from-[var(--color-primary-plum-700)] to-[var(--color-primary-plum-800)] text-white shadow-[0_12px_32px_-12px_rgba(108,78,108,0.35)] hover:shadow-[0_18px_40px_-14px_rgba(108,78,108,0.35)]',
      secondary:
        'bg-[rgba(144,104,144,0.08)] text-[var(--color-primary-plum-800)] hover:bg-[rgba(144,104,144,0.14)] border border-[rgba(144,104,144,0.3)]',
      outline:
        'border border-[rgba(17,17,17,0.12)] text-slate-800 bg-white hover:border-[var(--color-primary-plum-700)] hover:text-[var(--color-primary-plum-800)]',
      ghost: 'hover:bg-slate-100 text-slate-700',
      danger: 'bg-[var(--color-danger)] text-white hover:bg-red-700 shadow-[0_12px_30px_-14px_rgba(220,38,38,0.35)]',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'min-h-9 px-3 text-xs',
      md: 'min-h-11 px-4 text-sm',
      lg: 'min-h-14 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'interactive-transition inline-flex items-center justify-center rounded-full font-semibold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-plum-700)] disabled:opacity-50 disabled:pointer-events-none',
          'active:scale-[0.99] focus-visible:translate-y-[-1px]',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="-ml-1 mr-2 h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            role="presentation"
            aria-hidden
          >
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
