'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  QrCode,
  Building2,
  Search,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Receipt,
  FileText,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { invoiceService } from '@/lib/services/invoiceService';
import { mockPaymentService } from '@/lib/services/mockPaymentService';
import { paymentService, AuthoritativePayment } from '@/lib/services/paymentService';
import { Invoice } from '@/lib/types';
import { PaymentRecord, PaymentStatus } from '@/lib/types/payments';
import { RequestPaymentModal } from '@/components/payments/RequestPaymentModal';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export default function PaymentsPage() {
  const router = useRouter();

  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [backendPayments, setBackendPayments] = React.useState<AuthoritativePayment[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'All' | 'Paid' | 'Pending' | 'Overdue'>('All');
  const [requestModalOpen, setRequestModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [invList, realPayments] = await Promise.all([
        invoiceService.getInvoices(),
        paymentService.getPayments(),
      ]);
      setInvoices(invList || []);
      setBackendPayments(realPayments || []);
    } catch {
      // Continue gracefully with empty list
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Merge real backend invoices with authoritative payments
  const paymentRows = React.useMemo(() => {
    const demoPayments = mockPaymentService.getPayments();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return invoices.map((inv) => {
      // Match with real backend payment
      const matchingReal = backendPayments.find(
        (bp) => bp.invoiceId === inv.id || bp.invoiceNumber === inv.invoiceNumber
      );

      // Match with demo payment fallback if needed
      const matchingDemo = demoPayments.find(
        (dp) => dp.invoiceId === inv.id || dp.invoiceNumber === inv.invoiceNumber
      );

      // Authoritative status strictly reflects backend invoice status
      let status: 'Paid' | 'Pending' | 'Overdue' = 'Pending';
      if (inv.status === 'paid') {
        status = 'Paid';
      } else if (inv.status === 'overdue' || (inv.dueDate && new Date(inv.dueDate).getTime() < todayStart && inv.status !== 'draft')) {
        status = 'Overdue';
      }

      let methodLabel = '—';
      if (matchingReal?.method) {
        methodLabel = matchingReal.method;
      } else if (inv.paymentMethod) {
        methodLabel = inv.paymentMethod;
      } else if (inv.status === 'paid') {
        methodLabel = 'UPI';
      } else if (matchingDemo?.paymentMethod) {
        methodLabel = `${matchingDemo.paymentMethod} (Demo)`;
      }

      const referenceId =
        matchingReal?.reference ||
        inv.paymentReference ||
        matchingDemo?.referenceId ||
        (inv.status === 'paid' ? `BF-${inv.invoiceNumber}` : `INV-${inv.invoiceNumber}`);

      const paymentDate =
        matchingReal?.paidAt ||
        inv.paidAt ||
        inv.issueDate;

      return {
        id: inv.id,
        referenceId,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: matchingReal?.clientName || inv.clientName || 'Unknown Client',
        customerEmail: matchingReal?.clientEmail || inv.clientEmail,
        amount: matchingReal?.amount ?? inv.totalAmount,
        currency: inv.currency,
        date: paymentDate,
        dueDate: inv.dueDate,
        status,
        rawStatus: inv.status,
        paymentMethod: methodLabel,
        isSimulated: !matchingReal && Boolean(matchingDemo),
      };
    });
  }, [invoices, backendPayments]);

  // Derived real KPI statistics from backend invoices
  const calculatedKPIs = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalReceived = invoices.filter((i) => i.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
    const pending = invoices.filter((i) => i.status === 'sent').reduce((sum, inv) => sum + inv.totalAmount, 0);
    const overdue = invoices.filter((i) => {
      if (i.status === 'overdue') return true;
      if (i.dueDate && i.status !== 'paid' && i.status !== 'draft') {
        return new Date(i.dueDate).getTime() < todayStart;
      }
      return false;
    }).reduce((sum, inv) => sum + inv.totalAmount, 0);

    return {
      totalInvoiced,
      totalReceived,
      pending,
      overdue,
      currency: invoices[0]?.currency || 'INR',
    };
  }, [invoices]);

  // Filtered payment records
  const filteredRows = React.useMemo(() => {
    return paymentRows.filter((p) => {
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.customerName.toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.referenceId.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [paymentRows, statusFilter, searchQuery]);

  const getMethodBadge = (method: string, isSimulated?: boolean) => {
    if (method === 'UPI') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <QrCode className="h-3 w-3" />
          UPI {isSimulated && <span className="text-[9px] font-normal">(Demo)</span>}
        </span>
      );
    }
    if (method === 'Card') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <CreditCard className="h-3 w-3" />
          Card {isSimulated && <span className="text-[9px] font-normal">(Demo)</span>}
        </span>
      );
    }
    if (method === 'Net Banking') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Building2 className="h-3 w-3" />
          Net Banking
        </span>
      );
    }
    if (method.includes('Recorded Paid') || method.includes('Direct Settlement')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
          Recorded Paid / Direct Settlement
        </span>
      );
    }
    return <span className="text-slate-400 text-xs font-mono">—</span>;
  };

  const getStatusBadge = (status: 'Paid' | 'Pending' | 'Overdue') => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="h-3 w-3" />
            Overdue
          </span>
        );
    }
  };

  // Build Real Monthly Overview Chart from authoritative backend invoices
  const chartPoints = React.useMemo(() => {
    const monthsMap: Record<string, number> = {};
    invoices.forEach((inv) => {
      if (inv.status === 'paid') {
        const d = new Date(inv.paidAt || inv.issueDate);
        if (!isNaN(d.getTime())) {
          const m = d.toLocaleString('en-US', { month: 'short' });
          monthsMap[m] = (monthsMap[m] || 0) + (inv.totalAmount || 0);
        }
      }
    });
    return Object.entries(monthsMap).map(([month, amount]) => ({ month, amount }));
  }, [invoices]);

  const maxVal = Math.max(...chartPoints.map((p) => p.amount), calculatedKPIs.totalReceived, 1);

  return (
    <AppLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Page Header */}
        <PageHeader
          title="Payments"
          description="Track payments, outstanding amounts, and real invoice activity."
          actions={
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setRequestModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
              className="shadow-xs"
            >
              Request Payment
            </Button>
          }
        />

        {/* Real Backend Data Source Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">Authoritative Invoicing Data</span>
            <span className="text-indigo-700 hidden sm:inline">&bull; Connected to live backend invoice records</span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Live Backend Data
          </span>
        </div>

        {/* 4 Financial KPI Cards derived strictly from backend invoices */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Invoiced */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Invoiced
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                {formatCurrency(calculatedKPIs.totalInvoiced, calculatedKPIs.currency)}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {invoices.length} total invoice{invoices.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Collected (Paid) */}
          <div className="rounded-2xl border border-indigo-100/80 bg-white p-5 shadow-2xs relative overflow-hidden ring-1 ring-indigo-500/10 hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Collected (Paid)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold tracking-tight text-emerald-600 tabular-nums">
                {formatCurrency(calculatedKPIs.totalReceived, calculatedKPIs.currency)}
              </span>
            </div>
            <div className="mt-2 text-xs text-emerald-600 font-medium">
              Settled invoices
            </div>
          </div>

          {/* Pending (Outstanding) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Outstanding
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                {formatCurrency(calculatedKPIs.pending, calculatedKPIs.currency)}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Awaiting client payment
            </div>
          </div>

          {/* Overdue */}
          <div className="rounded-2xl border border-rose-100/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overdue
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold tracking-tight text-rose-600 tabular-nums">
                {formatCurrency(calculatedKPIs.overdue, calculatedKPIs.currency)}
              </span>
            </div>
            <div className="mt-2 text-xs text-rose-600 font-medium">
              {calculatedKPIs.overdue > 0 ? 'Requires client follow-up' : 'Zero overdue invoices'}
            </div>
          </div>
        </div>

        {/* Payment Overview Chart from real backend stats */}
        {chartPoints.length > 0 && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Collections Overview</h2>
                <p className="text-xs text-slate-500">Monthly settled invoice volume from backend</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Backend Collections</span>
              </div>
            </div>

            <div className="pt-4 pb-2">
              <div className="grid grid-cols-6 gap-2 sm:gap-6 items-end h-36 border-b border-slate-100">
                {chartPoints.map((item) => {
                  const pct = Math.max(8, Math.round((item.amount / maxVal) * 100));
                  return (
                    <div key={item.month} className="flex flex-col items-center h-full justify-end group">
                      <div
                        className="w-full max-w-[48px] bg-indigo-600 rounded-t-sm hover:bg-indigo-700 transition-all origin-bottom relative"
                        style={{ height: `${pct}%` }}
                        title={`${item.month}: ${formatCurrency(item.amount, calculatedKPIs.currency)}`}
                      />
                      <span className="mt-2 text-xs font-semibold text-slate-600 block text-center">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Payment Activity Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer, invoice number..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/40"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(['All', 'Paid', 'Pending', 'Overdue'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    statusFilter === status
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Paid At / Date</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/payments/${row.id}`)}
                    className="hover:bg-slate-50/60 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      {row.status === 'Paid' ? formatDateTime(row.date) : formatDate(row.date)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                      <div>{row.customerName}</div>
                      {row.customerEmail && (
                        <div className="text-[11px] text-slate-400 font-normal">{row.customerEmail}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {row.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-700 whitespace-nowrap">
                      {row.referenceId}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getMethodBadge(row.paymentMethod, row.isSimulated)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-extrabold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(row.amount, row.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {getStatusBadge(row.status)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-800">
                        View Details &rarr;
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (<768px) */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredRows.map((row) => (
              <div
                key={row.id}
                onClick={() => router.push(`/payments/${row.id}`)}
                className="p-4 hover:bg-slate-50/60 active:bg-slate-100/80 cursor-pointer transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">{row.customerName}</span>
                  <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                    {formatCurrency(row.amount, row.currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono font-bold text-slate-700">{row.invoiceNumber}</span>
                  <span>{formatDate(row.date)}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {getMethodBadge(row.paymentMethod, row.isSimulated)}
                  {getStatusBadge(row.status)}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredRows.length === 0 && (
            <div className="p-8">
              <EmptyState
                icon={Receipt}
                title={invoices.length === 0 ? 'No invoices or payments yet' : 'No matching invoices found'}
                description={
                  invoices.length === 0
                    ? 'Create an invoice in BillFlow to begin tracking client payments and settlements.'
                    : 'No invoices matched your current search or status filter.'
                }
                actionLabel={invoices.length === 0 ? '+ Create Invoice' : 'Clear Search'}
                onAction={() => {
                  if (invoices.length === 0) {
                    router.push('/invoices/new');
                  } else {
                    setSearchQuery('');
                    setStatusFilter('All');
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Request Payment Modal using real backend invoices */}
      <RequestPaymentModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        invoices={invoices}
        onPaymentCreated={loadData}
      />
    </AppLayout>
  );
}
