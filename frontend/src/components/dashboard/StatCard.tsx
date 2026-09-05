import * as React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'blue' | 'rose' | 'indigo' | 'neutral';
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  isPrimary?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'indigo',
  trend,
  isPrimary = false,
  className,
}: StatCardProps) {
  const iconVariants = {
    emerald: 'bg-emerald-50 text-emerald-600 border border-emerald-100/80',
    blue: 'bg-blue-50 text-blue-600 border border-blue-100/80',
    rose: 'bg-rose-50 text-rose-600 border border-rose-100/80',
    indigo: 'bg-indigo-50 text-indigo-600 border border-indigo-100/80',
    neutral: 'bg-slate-50 text-slate-500 border border-slate-200/80',
  };

  return (
    <Card
      className={cn(
        'transition-all duration-150 hover:border-slate-300 hover:shadow-xs bg-white overflow-hidden border-slate-200/90',
        isPrimary && 'border-slate-300 shadow-2xs',
        className
      )}
    >
      <CardContent className="p-5 sm:p-5.5 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </span>
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-2xs', iconVariants[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>

          {(trend || subtext) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 font-semibold px-2 py-0.5 rounded-full text-[11px] leading-tight',
                    trend.isPositive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                  )}
                >
                  {trend.isPositive ? (
                    <ArrowUpRight className="h-3 w-3 shrink-0" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 shrink-0" />
                  )}
                  <span>{trend.value}</span>
                </span>
              )}
              {trend?.label && <span className="text-slate-400 text-[11px]">{trend.label}</span>}
              {!trend && subtext && <span className="text-slate-400 text-[11px]">{subtext}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
