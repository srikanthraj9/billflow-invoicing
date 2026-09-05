import * as React from 'react';
import { TrendingUp, Clock, AlertCircle, FileText } from 'lucide-react';
import { StatCard } from './StatCard';
import { DashboardStats as DashboardStatsType } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export interface DashboardStatsProps {
  stats: DashboardStatsType;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const currency = stats.currency || 'INR';
  const hasOverdue = stats.totalOverdue > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* 1. Total Earned - Anchoring Primary KPI */}
      <StatCard
        label="Total Earned"
        value={formatCurrency(stats.totalEarned, currency)}
        variant="emerald"
        icon={TrendingUp}
        isPrimary={true}
        trend={{
          value: '+14.2%',
          isPositive: true,
          label: 'vs last month',
        }}
      />

      {/* 2. Outstanding */}
      <StatCard
        label="Outstanding"
        value={formatCurrency(stats.totalOutstanding, currency)}
        variant="blue"
        icon={Clock}
        subtext={`${stats.pendingInvoicesCount ?? 1} invoice pending payment`}
      />

      {/* 3. Overdue - Highlights softly ONLY if overdue > 0 */}
      <StatCard
        label="Overdue"
        value={formatCurrency(stats.totalOverdue, currency)}
        variant={hasOverdue ? 'rose' : 'neutral'}
        icon={AlertCircle}
        className={hasOverdue ? 'border-rose-200 bg-rose-50/15' : undefined}
        trend={
          hasOverdue
            ? {
                value: `${stats.overdueInvoicesCount ?? 1} overdue`,
                isPositive: false,
                label: 'requires follow-up',
              }
            : undefined
        }
        subtext={!hasOverdue ? 'All invoices are up to date' : undefined}
      />

      {/* 4. Total Invoices */}
      <StatCard
        label="Total Invoices"
        value={String(stats.totalInvoicesCount)}
        variant="indigo"
        icon={FileText}
        subtext="Created across all clients"
      />
    </div>
  );
}
