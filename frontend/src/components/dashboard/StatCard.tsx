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
  className?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'indigo',
  trend,
  className,
}: StatCardProps) {
  const iconVariants = {
    emerald: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border border-blue-100',
    rose: 'bg-rose-50 text-rose-600 border border-rose-100',
    indigo: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <Card
      className={cn(
        'transition-all hover:border-slate-300 hover:shadow-sm bg-white overflow-hidden',
        className
      )}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </span>
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', iconVariants[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>

          {(trend || subtext) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 font-semibold',
                    trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                  )}
                >
                  {trend.isPositive ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {trend.value}
                </span>
              )}
              {trend?.label && <span className="text-slate-500">{trend.label}</span>}
              {!trend && subtext && <span className="text-slate-500">{subtext}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
