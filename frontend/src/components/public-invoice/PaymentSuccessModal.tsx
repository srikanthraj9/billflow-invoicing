import * as React from 'react';
import { CheckCircle2, Receipt, Printer, X, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Invoice } from '@/lib/types';
import { PaymentRecord } from '@/lib/types/payments';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  paymentRecord?: PaymentRecord | null;
}

export function PaymentSuccessModal({
  isOpen,
  onClose,
  invoice,
  paymentRecord,
}: PaymentSuccessModalProps) {
  const method = paymentRecord?.paymentMethod || 'UPI';
  const reference = paymentRecord?.referenceId || `BF-DEMO-${invoice.invoiceNumber}`;
  const paidDate = paymentRecord?.paidAt || invoice.paidAt || new Date().toISOString();

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="py-2 space-y-4 text-center">
        {/* Animated Check Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-6 ring-emerald-50/60 shadow-xs">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Payment Completed
          </span>
          <h3 className="text-lg font-extrabold text-slate-900">
            Payment Receipt
          </h3>
          <p className="text-xs text-slate-500">
            Simulated payment voucher for invoice <span className="font-mono font-bold text-slate-700">{invoice.invoiceNumber}</span>
          </p>
        </div>

        {/* Authoritative Receipt Details Box */}
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/90 text-xs space-y-2.5 text-left">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
                <Receipt className="h-4 w-4" />
              </div>
              <span className="font-bold text-slate-900 tracking-tight">BillFlow Receipt</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500 font-semibold">{reference}</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Amount Paid:</span>
            <span className="text-base font-extrabold text-slate-900 tabular-nums">
              {formatCurrency(invoice.totalAmount, invoice.currency)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Invoice Number:</span>
            <span className="font-semibold text-slate-900 font-mono">{invoice.invoiceNumber}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="font-semibold text-slate-900">{invoice.clientName || 'Customer'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Payment Method:</span>
            <span className="font-semibold text-slate-900">{method}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Reference ID:</span>
            <span className="font-mono font-bold text-slate-900">{reference}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Payment Date/Time:</span>
            <span className="font-semibold text-slate-900">{formatDateTime(paidDate)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Status:</span>
            <span className="font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md text-[11px]">
              Paid
            </span>
          </div>

          <div className="flex justify-between border-t border-slate-200/70 pt-2 text-[11px] text-slate-400">
            <span>Transaction Type:</span>
            <span>Demo Transaction</span>
          </div>
        </div>

        {/* Mandatory Demo Safety Disclaimer */}
        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/90 text-center text-[11px] font-bold text-amber-900 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>DEMO / SIMULATED PAYMENT &bull; NO REAL MONEY TRANSFERRED</span>
        </div>

        {/* Action Buttons */}
        <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="flex-1 justify-center"
            onClick={handlePrint}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Print Receipt
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="flex-1 justify-center"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
