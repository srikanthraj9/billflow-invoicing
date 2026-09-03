'use client';

import * as React from 'react';
import { CreditCard, Lock, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Invoice, BusinessSettings } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { publicInvoiceService } from '@/lib/services/publicInvoiceService';

export interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  business?: Partial<BusinessSettings>;
  onPaymentSuccess: (updatedInvoice: Invoice) => void;
}

export function PaymentDialog({
  isOpen,
  onClose,
  invoice,
  business,
  onPaymentSuccess,
}: PaymentDialogProps) {
  const toast = useToast();

  const [cardNumber, setCardNumber] = React.useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = React.useState('12/28');
  const [cvc, setCvc] = React.useState('123');
  const [cardholderName, setCardholderName] = React.useState(invoice.clientName || 'Demo Customer');

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleFillTestCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setExpiry('12/28');
    setCvc('123');
    setCardholderName(invoice.clientName || 'Sarah Jenkins');
    setError(null);
    toast.info('Test Card Pre-filled', 'Using 4242 demo test credentials.');
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Simple validation
    if (!cardNumber.trim() || !expiry.trim() || !cvc.trim() || !cardholderName.trim()) {
      setError('Please complete all card payment fields.');
      return;
    }

    // Simulate declined card test if card ends in 0002
    if (cardNumber.replace(/\s/g, '').endsWith('0002')) {
      setError('Card Declined: Test card was declined by simulated issuer.');
      toast.error('Payment Failed', 'Card declined. Please use the demo card.');
      return;
    }

    setIsProcessing(true);

    try {
      const updated = await publicInvoiceService.payPublicInvoice(invoice.token);
      onPaymentSuccess(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment simulation failed.';
      setError(msg);
      toast.error('Payment Error', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const merchantName = business?.businessName?.trim() || 'Merchant';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Payment"
      description={`Pay ${invoice.invoiceNumber} to ${merchantName}.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmitPayment} className="space-y-4 pt-2">
        {/* Total Amount Due Banner */}
        <div className="rounded-xl bg-slate-900 text-white p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Total Amount Due</span>
            <span className="text-xl font-bold tracking-tight text-white tabular-nums">
              {formatCurrency(invoice.totalAmount, invoice.currency)}
            </span>
          </div>
          <span className="rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-1 text-xs font-semibold">
            {invoice.invoiceNumber}
          </span>
        </div>

        {/* Demo Mode Notice & Test Card Button */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs">
          <div className="flex items-center gap-1.5 text-indigo-900 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span>Simulated Test Payment</span>
          </div>
          <button
            type="button"
            onClick={handleFillTestCard}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline underline-offset-2 flex items-center gap-1"
          >
            <Zap className="h-3 w-3" />
            <span>Fill Test Card</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="rounded-lg bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-900 flex items-start gap-2 animate-in fade-in"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{error}</p>
              <p className="mt-0.5 text-rose-700">Click &ldquo;Fill Test Card&rdquo; above to use valid test credentials.</p>
            </div>
          </div>
        )}

        {/* Card Fields */}
        <div className="space-y-3 pt-1">
          <Input
            label="Name on Card"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="Sarah Jenkins"
            disabled={isProcessing}
            required
          />

          <Input
            label="Card Number"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="4242 4242 4242 4242"
            leftIcon={<CreditCard className="h-4 w-4 text-slate-400" />}
            disabled={isProcessing}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Expiry Date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              placeholder="MM/YY"
              disabled={isProcessing}
              required
            />

            <Input
              label="CVC / CVV"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              placeholder="123"
              leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
              disabled={isProcessing}
              required
            />
          </div>
        </div>

        {/* Submit & Security Disclaimer */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center shadow-md shadow-indigo-600/10"
            isLoading={isProcessing}
            leftIcon={!isProcessing && <Lock className="h-4 w-4" />}
          >
            Pay {formatCurrency(invoice.totalAmount, invoice.currency)}
          </Button>

          <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            <span>256-bit encrypted simulated checkout. No real money will be charged.</span>
          </p>
        </div>
      </form>
    </Modal>
  );
}
