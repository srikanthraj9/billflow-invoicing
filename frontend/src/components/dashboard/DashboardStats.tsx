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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* 1. Total Earned */}
      <StatCard
        label="Total Earned"
        value={formatCurrency(stats.totalEarned, currency)}
        variant="emerald"
        icon={TrendingUp}
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

      {/* 3. Overdue */}
      <StatCard
        label="Overdue"
        value={formatCurrency(stats.totalOverdue, currency)}
        variant="rose"
        icon={AlertCircle}
        trend={
          stats.totalOverdue > 0
            ? {
                value: `${stats.overdueInvoicesCount ?? 1} overdue`,
                isPositive: false,
                label: 'requires follow-up',
              }
            : undefined
        }
        subtext={stats.totalOverdue === 0 ? 'All invoices are up to date' : undefined}
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
