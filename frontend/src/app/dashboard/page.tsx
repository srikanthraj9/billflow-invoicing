'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { Button } from '@/components/ui/Button';
import { dashboardService } from '@/lib/services/dashboardService';
import { authService } from '@/lib/services/authService';
import { DashboardStats as DashboardStatsType, User } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { FilePlus, CreditCard, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

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

                {/* 5B. Payment Snapshot */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900">Payment Snapshot</h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Overview of settlements, pending balances, and recent collections.
                      </p>
                    </div>
                    <Link href="/payments">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      >
                        View Payments
                      </Button>
                    </Link>
                  </div>

                  {/* 3 Metric Summary Boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <div className="rounded-xl bg-slate-50/70 p-3.5 border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Received
                      </span>
                      <span className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5 block">
                        {formatCurrency(stats.totalEarned, stats.currency)}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50/70 p-3.5 border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Pending
                      </span>
                      <span className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5 block">
                        {formatCurrency(stats.totalOutstanding, stats.currency)}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50/70 p-3.5 border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Overdue
                      </span>
                      <span className="text-lg font-extrabold text-rose-600 tabular-nums mt-0.5 block">
                        {formatCurrency(stats.totalOverdue, stats.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Recent Payments Preview */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-700 block">Recent Activity:</span>
                    {stats.recentInvoices && stats.recentInvoices.length > 0 ? (
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/40 overflow-hidden">
                        {stats.recentInvoices.slice(0, 3).map((inv) => (
                          <div
                            key={inv.id}
                            onClick={() => router.push(`/payments/${inv.id}`)}
                            className="p-3 flex items-center justify-between text-xs hover:bg-white transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              {inv.status === 'paid' ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              ) : inv.status === 'overdue' ? (
                                <Clock className="h-4 w-4 text-rose-500 shrink-0" />
                              ) : (
                                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                              )}
                              <span className="font-extrabold text-slate-900 tabular-nums">
                                {formatCurrency(inv.totalAmount, inv.currency)}
                              </span>
                              <span className="text-slate-700 font-medium">
                                {inv.clientName || inv.clientCompany || 'Valued Client'}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                                ({inv.invoiceNumber})
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-slate-500 capitalize">
                              {inv.status === 'paid' ? 'Recorded Paid' : inv.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                        No recent invoices or payment activity recorded.
                      </div>
                    )}
                  </div>
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
