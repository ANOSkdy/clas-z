import * as React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-slate-800">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-lg border border-[rgba(17,17,17,0.12)] bg-white px-3 py-2 text-sm placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] focus-visible:border-[var(--color-primary-plum-700)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-plum-700)] focus-visible:ring-offset-2',
            error && 'border-[var(--color-danger)] focus-visible:ring-[color:var(--color-danger)]',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs font-medium text-[var(--color-danger)]">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
