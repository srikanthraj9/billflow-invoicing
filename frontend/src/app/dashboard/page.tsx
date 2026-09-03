'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  WelcomeBanner,
  DashboardStats,
  OverdueAlert,
  IncomeChart,
  RecentInvoices,
  QuickActions,
  DashboardSkeleton,
} from '@/components/dashboard';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { dashboardService } from '@/lib/services/dashboardService';
import { authService } from '@/lib/services/authService';
import { DashboardStats as DashboardStatsType, User } from '@/lib/types';
import { FilePlus } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = React.useState<DashboardStatsType | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadDashboardData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statsData, userData] = await Promise.all([
        dashboardService.getDashboardStats(),
        authService.getCurrentUser(),
      ]);
      setStats(statsData);
      setUser(userData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load dashboard data.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <AppLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Loading State */}
        {isLoading && <DashboardSkeleton />}

        {/* Error State */}
        {!isLoading && error && (
          <ErrorState
            title="Unable to load your dashboard"
            message={error}
            onRetry={loadDashboardData}
          />
        )}

        {/* Loaded Content */}
        {!isLoading && !error && stats && (
          <>
            {/* 1. Welcome Greeting & Header */}
            <WelcomeBanner
              userName={user?.name || 'there'}
              businessName={user?.businessName}
            />

            {/* 2. Overdue Invoices Alert (Conditional) */}
            {stats.totalOverdue > 0 && (
              <OverdueAlert
                overdueAmount={stats.totalOverdue}
                overdueCount={stats.overdueInvoicesCount}
                currency={stats.currency}
              />
            )}

            {/* 3. Empty Workspace Fallback */}
            {stats.totalInvoicesCount === 0 ? (
              <EmptyState
                icon={FilePlus}
                title="Your invoicing workspace is ready"
                description="Create your first client and generate an invoice to start tracking your cashflow."
                actionLabel="Create Invoice"
                onAction={() => router.push('/invoices/new')}
                secondaryActionLabel="Add Client"
                onSecondaryAction={() => router.push('/clients/new')}
              />
            ) : (
              <>
                {/* 4. Four Financial Summary Cards */}
                <DashboardStats stats={stats} />

                {/* 5. Income Trend Chart & Quick Actions */}
                <div className="space-y-6">
                  <IncomeChart data={stats.monthlyIncome} currency={stats.currency} />
                  <QuickActions />
                </div>

                {/* 6. Recent Invoices Section */}
                <RecentInvoices invoices={stats.recentInvoices} />
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
