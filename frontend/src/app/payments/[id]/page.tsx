'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  FileText,
  CheckCircle2,
  Receipt,
  QrCode,
  CreditCard,
  Building2,
  ShieldCheck,
  Calendar,
  User,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { mockPaymentService } from '@/lib/services/mockPaymentService';
import { invoiceService } from '@/lib/services/invoiceService';
import { Invoice } from '@/lib/types';
import { PaymentRecord } from '@/lib/types/payments';
import { formatDate } from '@/lib/utils';

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = (params?.id as string) || '';

  const [invoice, setInvoice] = React.useState<Invoice | null>(null);
  const [payment, setPayment] = React.useState<PaymentRecord | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        // 1. Check local simulated payment store
        const p = mockPaymentService.getPaymentById(paymentId) ||
                  mockPaymentService.getPaymentByInvoiceId(paymentId);
        if (isMounted) setPayment(p);

        // 2. Resolve real backend invoice
        let matchedInvoice: Invoice | null = null;

        // Try direct UUID fetch
        try {
          matchedInvoice = await invoiceService.getInvoiceById(paymentId);
        } catch {
          // paymentId might not be a valid UUID
        }

        // If not found, fetch all invoices and match by id or invoiceNumber
        if (!matchedInvoice) {
          const all = await invoiceService.getInvoices();
          const lowerId = paymentId.toLowerCase();
          matchedInvoice =
            all.find(
              (inv) =>
                inv.id === paymentId ||
                inv.invoiceNumber.toLowerCase() === lowerId ||
                (p?.invoiceId && inv.id === p.invoiceId) ||
                (p?.invoiceNumber && inv.invoiceNumber.toLowerCase() === p.invoiceNumber.toLowerCase())
            ) || null;
        }

        if (isMounted) {
          setInvoice(matchedInvoice);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading payment details:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    if (paymentId) {
      loadData();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [paymentId]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-20 text-center">
          <p className="text-sm text-slate-500">Loading authoritative invoice and payment details...</p>
        </div>
      </AppLayout>
    );
  }

  if (!invoice && !payment) {
    return (
      <AppLayout>
        <div className="py-16 text-center max-w-md mx-auto space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Record Not Found</h2>
          <p className="text-xs text-slate-500">
            No matching backend invoice or simulated payment record was found for reference &ldquo;{paymentId}&rdquo;.
          </p>
          <Link href="/payments">
            <Button variant="primary" size="md">
              Return to Payments
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Derive authoritative values from real backend invoice, with fallback to payment record
  const invoiceNumber = invoice?.invoiceNumber || payment?.invoiceNumber || 'INV-DEMO';
  const customerName = invoice?.clientName || payment?.customerName || 'Valued Client';
  const customerEmail = invoice?.clientEmail || payment?.customerEmail || '';
  const amount = invoice?.totalAmount ?? (payment?.amount || 0);
  const issueDate = invoice?.issueDate || payment?.date || new Date().toISOString().split('T')[0];
  const dueDate = invoice?.dueDate || payment?.date || new Date().toISOString().split('T')[0];
  const invoiceStatus = invoice?.status || (payment?.status === 'Paid' ? 'paid' : 'draft');
  const isSimulated = Boolean(payment?.isSimulated || payment);
  const referenceId = payment?.referenceId || `REC-${invoiceNumber}`;
  const paymentMethod = payment?.paymentMethod || (invoiceStatus === 'paid' ? 'Recorded Paid' : '—');
  const paymentDate = payment?.date || invoice?.paidAt || issueDate;

  return (
    <AppLayout>
      <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
        {/* Navigation & Actions (Hidden during print) */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href="/payments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Payments</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(invoice ? `/invoices` : '/invoices')}
              leftIcon={<FileText className="h-3.5 w-3.5" />}
            >
              View Invoice
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="h-3.5 w-3.5" />}
              className="shadow-xs"
            >
              Print Receipt
            </Button>
          </div>
        </div>

        {/* Honest Demo / Association Banner (Hidden during print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">{isSimulated ? 'Demo Transaction' : 'Recorded Invoice Payment'}</span>
            <span className="text-indigo-700">
              &bull; Associated with backend invoice <strong className="font-mono font-bold">{invoiceNumber}</strong>
            </span>
          </div>
          <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
            {referenceId}
          </span>
        </div>

        {/* Printable Payment Receipt Presentation */}
        <div
          id="payment-receipt-sheet"
          className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden print:border-none print:shadow-none"
        >
          {/* Receipt Top Header */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                  BILLFLOW
                </h1>
                <span className="text-xs text-slate-400 mt-1 block">Payment Receipt &bull; Authoritative Invoice Voucher</span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold block">
                Reference ID
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {referenceId}
              </span>
            </div>
          </div>

          {/* Status Band */}
          <div className={`border-y px-6 sm:px-8 py-3.5 flex items-center justify-between ${
            invoiceStatus === 'paid'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : 'bg-amber-50 border-amber-100 text-amber-800'
          }`}>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className={`h-4 w-4 ${invoiceStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span>
                {invoiceStatus === 'paid' ? 'Payment Recorded &bull; Settled' : 'Invoice Awaiting Settlement'}
              </span>
            </div>
            <span className="text-xs font-mono font-semibold uppercase px-2.5 py-0.5 rounded-md bg-white/80 border border-current">
              {invoiceStatus}
            </span>
          </div>

          {/* Amount Hero Section */}
          <div className="p-6 sm:p-8 border-b border-slate-100 text-center space-y-1.5 bg-slate-50/40">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Amount ({invoiceStatus === 'paid' ? 'Paid' : 'Due'})
            </span>
            <div className="text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">
              ₹{amount.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-400">
              {invoiceStatus === 'paid'
                ? `Settled via ${paymentMethod} on ${formatDate(paymentDate)}`
                : `Invoice due on ${formatDate(dueDate)}`}
            </p>
          </div>

          {/* Real Backend Metadata Grid */}
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <span className="text-slate-400 block uppercase tracking-wider font-semibold text-[10px]">
                  Customer / Client Name
                </span>
                <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                  {customerName}
                </span>
                {customerEmail && (
                  <span className="text-slate-500 block text-xs mt-0.5">{customerEmail}</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block uppercase tracking-wider font-semibold text-[10px]">
                  Backend Invoice Reference
                </span>
                <span className="text-sm font-mono font-semibold text-slate-900 mt-0.5 block">
                  {invoiceNumber}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block uppercase tracking-wider font-semibold text-[10px]">
                  Invoice Status
                </span>
                <span className="text-xs font-semibold text-slate-700 mt-0.5 capitalize block">
                  {invoiceStatus}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-slate-400 block uppercase tracking-wider font-semibold text-[10px]">
                  Payment Method
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {paymentMethod === 'UPI' && <QrCode className="h-4 w-4 text-emerald-600" />}
                  {paymentMethod === 'Card' && <CreditCard className="h-4 w-4 text-indigo-600" />}
                  {paymentMethod === 'Net Banking' && <Building2 className="h-4 w-4 text-blue-600" />}
                  <span className="text-sm font-semibold text-slate-900">
                    {paymentMethod}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block uppercase tracking-wider font-semibold text-[10px]">
                  Issue Date &bull; Due Date
                </span>
                <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                  {formatDate(issueDate)} &bull; {formatDate(dueDate)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block uppercase tracking-wider font-semibold text-[10px]">
                  Settlement Date
                </span>
                <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                  {formatDate(paymentDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Mandatory Demo / Safety Notice */}
          <div className="p-3.5 bg-amber-50/70 border-t border-b border-amber-200/80 text-center text-xs font-bold text-amber-900 tracking-wide">
            DEMO / SIMULATED PAYMENT &bull; ASSOCIATED WITH BACKEND INVOICE {invoiceNumber} &bull; NO REAL MONEY TRANSFERRED
          </div>

          {/* Bottom Security Note */}
          <div className="px-6 sm:px-8 py-4 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <span>BillFlow Pay &bull; Authoritative Invoice Link</span>
            <span>Simulated demonstration receipt &bull; Authoritative data from backend database</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

