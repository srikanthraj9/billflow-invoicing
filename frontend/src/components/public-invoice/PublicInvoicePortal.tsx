'use client';

import * as React from 'react';
import { Printer, CreditCard, CheckCircle2, ShieldCheck, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InvoiceDocument } from '@/components/invoices/InvoiceDocument';
import { PaymentDialog } from './PaymentDialog';
import { PaymentSuccessModal } from './PaymentSuccessModal';
import { Invoice, BusinessSettings } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface PublicInvoicePortalProps {
  initialInvoice: Invoice;
  business?: Partial<BusinessSettings>;
}

export function PublicInvoicePortal({ initialInvoice, business }: PublicInvoicePortalProps) {
  const [invoice, setInvoice] = React.useState<Invoice>(initialInvoice);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [paymentSuccessOpen, setPaymentSuccessOpen] = React.useState(false);

  const isPaid = invoice.status === 'paid';
  const isDraft = invoice.status === 'draft';
  const canPay = !isPaid && !isDraft;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handlePaymentSuccess = (updated: Invoice) => {
    setInvoice(updated);
    setPaymentSuccessOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100/80 py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Public Top Portal Bar (Hidden during print) */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-xs">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  {business?.businessName?.trim() || 'BillFlow Merchant'}
                </span>
                <span className="text-xs text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-mono font-semibold">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">Secure Client Invoicing Portal</p>
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
                className="shadow-sm shadow-indigo-600/20"
              >
                Pay {formatCurrency(invoice.totalAmount, invoice.currency)}
              </Button>
            )}

            {isPaid && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>PAID</span>
              </div>
            )}
          </div>
        </div>

        {/* Paid Banner notice if already paid */}
        {isPaid && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-center gap-3 text-xs sm:text-sm text-emerald-950 shadow-2xs print:hidden animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">This invoice is paid in full.</p>
              <p className="text-emerald-800 text-xs mt-0.5">
                Payment was processed and cleared on {formatDate(invoice.paidAt || new Date().toISOString())}.
              </p>
            </div>
          </div>
        )}

        {/* The Printable Invoice Document */}
        <InvoiceDocument invoice={invoice} business={business} />

        {/* Footer info (Hidden in print) */}
        <div className="text-center text-xs text-slate-400 py-4 print:hidden space-y-1">
          <p className="flex items-center justify-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <span>Powered by BillFlow &bull; Fast, transparent invoicing for independent creators</span>
          </p>
        </div>
      </div>

      {/* Simulated Payment Modal */}
      {canPay && (
        <PaymentDialog
          isOpen={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          invoice={invoice}
          business={business}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Payment Success Receipt Modal */}
      <PaymentSuccessModal
        isOpen={paymentSuccessOpen}
        onClose={() => setPaymentSuccessOpen(false)}
        invoice={invoice}
      />
    </div>
  );
}
