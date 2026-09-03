import * as React from 'react';
import { CheckCircle2, Receipt, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Invoice } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export function PaymentSuccessModal({ isOpen, onClose, invoice }: PaymentSuccessModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="text-center py-4 space-y-4">
        {/* Animated Check Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm animate-in zoom-in-95 duration-200">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-xl font-bold text-slate-900">Payment Successful!</h3>
          <p className="text-xs text-slate-500">
            Thank you, {invoice.clientName}. Your payment has been received and recorded.
          </p>
        </div>

        {/* Receipt Details Box */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 text-xs space-y-2 text-left">
          <div className="flex justify-between">
            <span className="text-slate-500">Invoice Number:</span>
            <span className="font-semibold text-slate-900 font-mono">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount Paid:</span>
            <span className="font-bold text-slate-900 tabular-nums">
              {formatCurrency(invoice.totalAmount, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Payment Date:</span>
            <span className="font-semibold text-slate-900">
              {formatDate(invoice.paidAt || new Date().toISOString())}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="font-bold text-emerald-600">PAID & CLEARED</span>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          className="w-full justify-center"
          onClick={onClose}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          View Paid Receipt
        </Button>
      </div>
    </Modal>
  );
}
