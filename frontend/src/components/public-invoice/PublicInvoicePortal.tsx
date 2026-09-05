'use client';

import * as React from 'react';
import { Printer, CreditCard, CheckCircle2, ShieldCheck, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InvoiceDocument } from '@/components/invoices/InvoiceDocument';
import { PaymentDialog } from './PaymentDialog';
import { PaymentSuccessModal } from './PaymentSuccessModal';
import { Invoice, BusinessSettings } from '@/lib/types';
import { PaymentRecord } from '@/lib/types/payments';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { mockPaymentService } from '@/lib/services/mockPaymentService';

export interface PublicInvoicePortalProps {
  initialInvoice: Invoice;
  business?: Partial<BusinessSettings>;
}

export function PublicInvoicePortal({ initialInvoice, business }: PublicInvoicePortalProps) {
  const [invoice, setInvoice] = React.useState<Invoice>(initialInvoice);
  const [demoPayment, setDemoPayment] = React.useState<PaymentRecord | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false);

  // 1. Resolve payment state on initial load and keep in sync across browser refreshes/tabs
  React.useEffect(() => {
    const identifier = invoice.id || invoice.token || invoice.invoiceNumber;
    const existing = mockPaymentService.getPaymentByInvoice(identifier);
    if (existing && existing.status === 'Paid') {
      setDemoPayment(existing);
    }
  }, [invoice.id, invoice.token, invoice.invoiceNumber]);

  // Payment Resolution Hierarchy:
  // 1. Authoritative Backend Status (isBackendPaid)
  // 2. Existing Demo Payment in localStorage for this invoice (hasDemoPayment)
  // 3. Otherwise Unpaid
  const isBackendPaid = invoice.status === 'paid';
  const hasDemoPayment = Boolean(demoPayment && demoPayment.status === 'Paid');
  const isPaid = isBackendPaid || hasDemoPayment;
  const isDraft = invoice.status === 'draft';
  const canPay = !isPaid && !isDraft;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handlePaymentSuccess = (updated: Invoice, record?: PaymentRecord) => {
    setInvoice(updated);
    if (record) {
      setDemoPayment(record);
    } else {
      const p = mockPaymentService.getPaymentByInvoice(updated.id || updated.token || updated.invoiceNumber);
      if (p) setDemoPayment(p);
    }
    setPaymentDialogOpen(false);
  };

  const paymentMethod = invoice.paymentMethod || demoPayment?.paymentMethod || (isBackendPaid ? 'UPI' : 'UPI');
  const referenceId = invoice.paymentReference || demoPayment?.referenceId || `BF-${invoice.invoiceNumber}`;
  const paidAtTimestamp = invoice.paidAt || demoPayment?.paidAt || new Date().toISOString();

  return (
    <div className="min-h-screen bg-slate-100/80 py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Public Top Portal Bar (Hidden during print) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-xs shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  {business?.businessName?.trim() || 'BillFlow Merchant'}
                </span>
                <span className="text-xs text-slate-300">•</span>
                <span className="font-mono font-semibold text-xs text-slate-500">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">Client Invoicing Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              Print
            </Button>

            {canPay && (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setPaymentDialogOpen(true)}
                leftIcon={<CreditCard className="h-4 w-4" />}
                className="shadow-xs shadow-indigo-600/20 px-5"
              >
                Pay {formatCurrency(invoice.totalAmount, invoice.currency)}
              </Button>
            )}

            {isPaid && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>PAID</span>
              </div>
            )}
          </div>
        </div>

        {/* Prominent Payment Completed Card (PART 5 & PART 7 Requirement) */}
        {isPaid && (
          <div className="rounded-3xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/80 to-white p-6 sm:p-7 shadow-xs print:hidden animate-in fade-in space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span>✓ Payment Completed</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-200/80 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                {isBackendPaid ? 'Settled' : 'Demo Transaction'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                You Paid
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                {formatCurrency(invoice.totalAmount, invoice.currency)}
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-100/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Paid on</span>
                <span className="font-semibold text-slate-800">
                  {formatDateTime(paidAtTimestamp)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Method</span>
                <span className="font-semibold text-slate-800">
                  {paymentMethod}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Reference</span>
                <span className="font-mono font-bold text-slate-800">
                  {referenceId}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReceiptModalOpen(true)}
                leftIcon={<Receipt className="h-4 w-4 text-emerald-600" />}
                className="bg-white hover:bg-emerald-50/60 border-emerald-200 text-emerald-900 font-semibold"
              >
                View Receipt
              </Button>
              <span className="text-[11px] text-slate-400">
                Authoritative transaction voucher &bull; Simulated demonstration receipt
              </span>
            </div>
          </div>
        )}

        {/* The Printable Invoice Document */}
        <InvoiceDocument invoice={invoice} business={business} />

        {/* Footer info (Hidden in print) */}
        <div className="text-center text-xs text-slate-400 py-4 print:hidden space-y-1">
          <p className="flex items-center justify-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <span>Powered by BillFlow &bull; Transparent invoicing for independent businesses</span>
          </p>
        </div>
      </div>

      {/* Simulated Payment Modal - Strictly rendered ONLY when invoice can be paid */}
      {canPay && (
        <PaymentDialog
          isOpen={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          invoice={invoice}
          business={business}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Payment Success / Full Receipt Modal */}
      <PaymentSuccessModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        invoice={invoice}
        paymentRecord={demoPayment}
      />
    </div>
  );
}
