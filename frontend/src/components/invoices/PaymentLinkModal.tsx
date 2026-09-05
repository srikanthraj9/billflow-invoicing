'use client';

import * as React from 'react';
import { Link2, Copy, Check, Power, ShieldCheck, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Invoice } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { mockPaymentService } from '@/lib/services/mockPaymentService';
import { PaymentLink } from '@/lib/types/payments';

export interface PaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export function PaymentLinkModal({ isOpen, onClose, invoice }: PaymentLinkModalProps) {
  const toast = useToast();

  const [paymentLink, setPaymentLink] = React.useState<PaymentLink | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && invoice) {
      const link = mockPaymentService.createPaymentLink({
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
        currency: invoice.currency,
        invoiceId: invoice.id,
      });
      setPaymentLink(link);
      setCopied(false);
    }
  }, [isOpen, invoice]);

  const handleCopy = async () => {
    if (!paymentLink) return;
    try {
      await navigator.clipboard.writeText(paymentLink.displayUrl);
      setCopied(true);
      toast.success('Identifier Copied', `Demo token ${paymentLink.displayUrl} copied to clipboard.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info('Demo Link Token', paymentLink.displayUrl);
    }
  };

  const handleToggleStatus = () => {
    if (!paymentLink) return;
    const updated = mockPaymentService.toggleLinkStatus(paymentLink.id);
    if (updated) {
      setPaymentLink({ ...updated });
      toast.info(
        'Link Status Updated',
        `Payment link is now ${updated.status.toLowerCase()}.`
      );
    }
  };

  if (!paymentLink) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Demo Payment Link"
      description="Simulated payment identifier for client checkout testing."
      maxWidth="md"
    >
      <div className="space-y-4 pt-2">
        {/* Honest Demo Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">Simulated Payment Link &bull; Demo Feature</span>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
            Frontend State
          </span>
        </div>

        {/* Link Token Box */}
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Demo Link Token</span>
            <span
              className={`px-2 py-0.5 rounded-full font-semibold text-xs ${
                paymentLink.status === 'Active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-200 text-slate-600 border border-slate-300'
              }`}
            >
              {paymentLink.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 break-all select-all flex items-center gap-2">
              <Link2 className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>{paymentLink.displayUrl}</span>
            </div>
            <Button
              type="button"
              variant={copied ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleCopy}
              leftIcon={copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Invoice Summary Details */}
        <div className="rounded-xl border border-slate-100 p-3.5 space-y-2 text-xs bg-white">
          <div className="flex justify-between">
            <span className="text-slate-500">Invoice:</span>
            <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount:</span>
            <span className="font-extrabold text-slate-900 tabular-nums">
              {formatCurrency(invoice.totalAmount, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Recipient:</span>
            <span className="font-medium text-slate-900">{invoice.clientName}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            leftIcon={<Power className="h-3.5 w-3.5" />}
            className={paymentLink.status === 'Active' ? 'text-amber-700 border-amber-200 hover:bg-amber-50' : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'}
          >
            {paymentLink.status === 'Active' ? 'Disable Link' : 'Enable Link'}
          </Button>

          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
