import * as React from 'react';
import { cn } from '@/lib/utils';
import { InvoiceStatus } from '@/lib/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: InvoiceStatus | 'warning' | 'neutral' | 'outline' | 'primary';
  size?: 'sm' | 'md';
  withDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  withDot = true,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors border select-none';

  const variants = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    overdue: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    outline: 'bg-transparent text-slate-700 border-slate-300',
  };

  const dots = {
    draft: 'bg-slate-400',
    sent: 'bg-blue-500',
    paid: 'bg-emerald-500',
    overdue: 'bg-rose-500',
    warning: 'bg-amber-500',
    neutral: 'bg-slate-400',
    primary: 'bg-indigo-500',
    outline: 'bg-slate-400',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {withDot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dots[variant])} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};
