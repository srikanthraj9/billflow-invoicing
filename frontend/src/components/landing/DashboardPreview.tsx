import * as React from 'react';
import {
  TrendingUp,
  Clock,
  AlertCircle,
  Receipt,
  ArrowUpRight,
  MoreVertical,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

export function DashboardPreview() {
  const previewInvoices = [
    {
      id: 'INV-0001',
      client: 'Acme Technologies',
      project: 'Design System & Next.js Frontend',
      amount: 41300,
      dueDate: 'Sep 15, 2026',
      status: 'sent' as const,
    },
    {
      id: 'INV-0002',
      client: 'Nova Labs',
      project: 'AI Interaction Design Prototyping',
      amount: 23600,
      dueDate: 'Sep 05, 2026',
      status: 'paid' as const,
    },
    {
      id: 'INV-0003',
      client: 'PixelCraft Studio',
      project: 'Brand Identity Guidelines & Vector Export',
      amount: 17700,
      dueDate: 'Aug 20, 2026',
      status: 'overdue' as const,
    },
  ];

  const chartData = [
    { month: 'Apr', height: '40%', amount: '₹45k' },
    { month: 'May', height: '55%', amount: '₹62k' },
    { month: 'Jun', height: '70%', amount: '₹78k' },
    { month: 'Jul', height: '85%', amount: '₹95k' },
    { month: 'Aug', height: '92%', amount: '₹112k' },
    { month: 'Sep', height: '100%', amount: '₹125k', active: true },
  ];

  return (
    <div className="relative mx-auto w-full max-w-5xl rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 lg:p-8 shadow-xl shadow-slate-900/5">
      {/* Top Application Bar Mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Alex Morgan Design Studio</h2>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500">Live Invoicing & Financial Overview</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
            <span>Currency:</span>
            <span className="font-semibold text-slate-900">INR (₹)</span>
          </div>
          <span className="text-xs text-slate-400">Updated just now</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:bg-slate-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Earned
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100/80 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(125000, 'INR')}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>+14.2% from last month</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:bg-slate-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100/80 text-blue-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(41300, 'INR')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">1 invoice awaiting payment</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:bg-slate-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overdue
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100/80 text-rose-700">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(17700, 'INR')}
          </p>
          <p className="mt-1 text-[11px] text-rose-600 font-medium">1 invoice past due date</p>
        </div>
      </div>

      {/* 2-Column Split: Income Trend Chart + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-2">
        {/* Income Over Time Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-900">Income Over Time</h3>
              <span className="text-[11px] font-medium text-slate-400">Last 6 Months</span>
            </div>
            <p className="text-xs text-slate-500">Monthly collected freelancer revenue</p>
          </div>

          <div className="mt-6 flex items-end justify-between gap-2 h-36 pt-4 border-b border-slate-100">
            {chartData.map((item) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.amount}
                </span>
                <div
                  className={`w-full max-w-[28px] rounded-t-md transition-all ${
                    item.active ? 'bg-indigo-600 shadow-sm shadow-indigo-600/30' : 'bg-slate-200 hover:bg-slate-300'
                  }`}
                  style={{ height: item.height }}
                />
                <span
                  className={`text-[11px] font-medium ${
                    item.active ? 'font-bold text-indigo-700' : 'text-slate-500'
                  }`}
                >
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Invoices Table Mockup */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Invoices</h3>
              <p className="text-xs text-slate-500">Live payment and dispatch status</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600">View All (6)</span>
          </div>

          <div className="divide-y divide-slate-100">
            {previewInvoices.map((inv) => (
              <div
                key={inv.id}
                className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{inv.id}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="truncate text-xs font-semibold text-slate-700">
                      {inv.client}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-slate-400 mt-0.5">{inv.project}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900 tabular-nums">
                      {formatCurrency(inv.amount, 'INR')}
                    </p>
                    <p className="text-[10px] text-slate-400">Due {inv.dueDate}</p>
                  </div>
                  <Badge variant={inv.status} size="sm">
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
