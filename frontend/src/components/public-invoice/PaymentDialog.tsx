'use client';

import * as React from 'react';
import {
  CreditCard,
  Lock,
  AlertCircle,
  Zap,
  ShieldCheck,
  QrCode,
  Building2,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Check,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Invoice, BusinessSettings } from '@/lib/types';
import { PaymentMethod, PaymentRecord } from '@/lib/types/payments';
import { formatCurrency } from '@/lib/utils';
import { mockPaymentService } from '@/lib/services/mockPaymentService';
import { publicInvoiceService } from '@/lib/services/publicInvoiceService';

export interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  business?: Partial<BusinessSettings>;
  onPaymentSuccess?: (updatedInvoice: Invoice, paymentRecord?: PaymentRecord) => void;
}

export function PaymentDialog({
  isOpen,
  onClose,
  invoice,
  business,
  onPaymentSuccess,
}: PaymentDialogProps) {
  const toast = useToast();

  // Payment method selection
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethod>('UPI');

  // UPI sub-mode
  const [upiSubMode, setUpiSubMode] = React.useState<'qr' | 'vpa'>('qr');
  const [upiId, setUpiId] = React.useState('demo@upi');

  // Card fields
  const [cardNumber, setCardNumber] = React.useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = React.useState('12/28');
  const [cvc, setCvc] = React.useState('123');
  const [cardholderName, setCardholderName] = React.useState(invoice.clientName || 'Demo Customer');

  // Net Banking selected bank
  const [selectedBank, setSelectedBank] = React.useState('HDFC Bank');

  // Flow states: 'form' | 'processing' | 'success' | 'failed'
  const [flowState, setFlowState] = React.useState<'form' | 'processing' | 'success' | 'failed'>('form');
  const [referenceId, setReferenceId] = React.useState('BF-DEMO-839201');
  const [error, setError] = React.useState<string | null>(null);

  // Reset state when opened
  React.useEffect(() => {
    if (isOpen) {
      setFlowState('form');
      setError(null);
      setSelectedMethod('UPI');
      setUpiSubMode('qr');
    }
  }, [isOpen]);

  const handleFillTestCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setExpiry('12/28');
    setCvc('123');
    setCardholderName(invoice.clientName || 'Demo User');
    setError(null);
    toast.info('Test Card Pre-filled', 'Using 4242 demo test credentials.');
  };

  const handleTriggerPayment = async () => {
    setError(null);

    // Validation for card
    if (selectedMethod === 'Card') {
      if (!cardNumber.trim() || !expiry.trim() || !cvc.trim() || !cardholderName.trim()) {
        setError('Please complete all card payment fields.');
        return;
      }
      // Demo failure if card ends in 0002
      if (cardNumber.replace(/\s/g, '').endsWith('0002')) {
        setFlowState('failed');
        return;
      }
    }

    // Validation for UPI VPA
    if (selectedMethod === 'UPI' && upiSubMode === 'vpa') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. user@upi).');
        return;
      }
    }

    // Start processing
    setFlowState('processing');

    try {
      // Execute authoritative backend payment transaction
      const updatedInvoice = await publicInvoiceService.payPublicInvoice(invoice.token, {
        method: selectedMethod,
        amount: invoice.totalAmount,
      });

      const backendRef = updatedInvoice.paymentReference || `BF-${invoice.invoiceNumber}`;
      const backendPaidAt = updatedInvoice.paidAt || new Date().toISOString();
      setReferenceId(backendRef);

      const record: PaymentRecord = {
        id: backendRef,
        amount: invoice.totalAmount,
        currency: invoice.currency,
        customerName: invoice.clientName || 'Customer',
        customerEmail: invoice.clientEmail,
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice.id || invoice.token,
        token: invoice.token,
        paymentMethod: selectedMethod,
        status: 'Paid',
        date: backendPaidAt.split('T')[0],
        paidAt: backendPaidAt,
        referenceId: backendRef,
        notes: `Settled via ${selectedMethod}`,
      };

      // Keep mockPaymentService synchronized for UI fallback
      mockPaymentService.addDemoPayment(record);

      setFlowState('success');
      toast.success('Payment Completed', `Authoritative transaction ${backendRef} registered.`);

      // Notify parent component immediately of payment completion
      onPaymentSuccess?.(updatedInvoice, record);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to complete payment transaction.';
      setError(msg);
      setFlowState('form');
      toast.error('Payment Failed', msg);
    }
  };

  const merchantName = business?.businessName?.trim() || 'Merchant';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={flowState === 'form' ? 'BILLFLOW PAY' : flowState === 'processing' ? 'Processing Payment' : flowState === 'success' ? 'Payment Completed' : 'Payment Failed'}
      description={flowState === 'form' ? `Pay ${invoice.invoiceNumber} to ${merchantName}.` : undefined}
      maxWidth="md"
    >
      {/* ================================================================= */}
      {/* 1. PAYMENT FORM VIEW */}
      {/* ================================================================= */}
      {flowState === 'form' && (
        <div className="space-y-4 pt-2">
          {/* Amount Due Hero Banner */}
          <div className="rounded-2xl bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Total Amount Due</span>
              <span className="text-2xl font-extrabold tracking-tight text-white tabular-nums">
                {formatCurrency(invoice.totalAmount, invoice.currency)}
              </span>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-3 py-1 text-xs font-semibold block">
                {invoice.invoiceNumber}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">{merchantName}</span>
            </div>
          </div>

          {/* Simulated Notice */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
            <div className="flex items-center gap-1.5 text-indigo-900 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span>Simulated Test Payment &bull; Demo Transaction</span>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
              No Real Charge
            </span>
          </div>

          {/* Payment Method Selector Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('UPI');
                  setError(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedMethod === 'UPI'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <QrCode
                  className={`h-5 w-5 mb-1 ${
                    selectedMethod === 'UPI' ? 'text-indigo-600' : 'text-slate-500'
                  }`}
                />
                <span className="text-xs font-bold text-slate-900 block leading-tight">UPI</span>
                <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                  Instant QR / VPA
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('Card');
                  setError(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedMethod === 'Card'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <CreditCard
                  className={`h-5 w-5 mb-1 ${
                    selectedMethod === 'Card' ? 'text-indigo-600' : 'text-slate-500'
                  }`}
                />
                <span className="text-xs font-bold text-slate-900 block leading-tight">Card</span>
                <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                  Credit or debit
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('Net Banking');
                  setError(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedMethod === 'Net Banking'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <Building2
                  className={`h-5 w-5 mb-1 ${
                    selectedMethod === 'Net Banking' ? 'text-indigo-600' : 'text-slate-500'
                  }`}
                />
                <span className="text-xs font-bold text-slate-900 block leading-tight">Net Banking</span>
                <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                  Direct bank
                </span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              className="rounded-xl bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-900 flex items-start gap-2 animate-in fade-in"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* METHOD 1: UPI CHECKOUT */}
          {selectedMethod === 'UPI' && (
            <div className="space-y-4 pt-1">
              {/* Sub-mode Toggle (QR vs VPA) */}
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setUpiSubMode('qr')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    upiSubMode === 'qr'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Scan QR Code
                </button>
                <button
                  type="button"
                  onClick={() => setUpiSubMode('vpa')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    upiSubMode === 'vpa'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Enter UPI ID
                </button>
              </div>

              {/* QR Code Demo Visual */}
              {upiSubMode === 'qr' && (
                <div className="text-center space-y-3 py-2">
                  <div className="mx-auto w-48 h-48 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col items-center justify-center relative">
                    {/* SVG Demo QR Visual */}
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full text-slate-900"
                      fill="currentColor"
                      aria-label="Demo QR Visual"
                    >
                      {/* Top-Left Position Marker */}
                      <rect x="5" y="5" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
                      <rect x="11" y="11" width="14" height="14" rx="2" />
                      {/* Top-Right Position Marker */}
                      <rect x="69" y="5" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
                      <rect x="75" y="11" width="14" height="14" rx="2" />
                      {/* Bottom-Left Position Marker */}
                      <rect x="5" y="69" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
                      <rect x="11" y="75" width="14" height="14" rx="2" />
                      {/* Abstract Data Patterns */}
                      <rect x="36" y="8" width="6" height="6" />
                      <rect x="46" y="8" width="6" height="6" />
                      <rect x="56" y="8" width="6" height="6" />
                      <rect x="36" y="20" width="6" height="6" />
                      <rect x="50" y="20" width="12" height="6" />
                      <rect x="8" y="38" width="6" height="12" />
                      <rect x="20" y="38" width="8" height="6" />
                      <rect x="36" y="36" width="28" height="28" rx="6" fill="#4f46e5" />
                      <circle cx="50" cy="50" r="8" fill="#ffffff" />
                      <rect x="69" y="38" width="8" height="6" />
                      <rect x="83" y="38" width="8" height="12" />
                      <rect x="8" y="54" width="12" height="6" />
                      <rect x="80" y="54" width="12" height="6" />
                      <rect x="36" y="72" width="6" height="12" />
                      <rect x="46" y="76" width="12" height="6" />
                      <rect x="62" y="72" width="6" height="12" />
                      <rect x="72" y="72" width="8" height="6" />
                      <rect x="84" y="80" width="8" height="8" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-800">
                      Scan with any UPI app (GPay, PhonePe, Paytm)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Demo QR visual &bull; No real payment is processed.
                    </p>
                  </div>
                </div>
              )}

              {/* UPI ID (VPA) Input */}
              {upiSubMode === 'vpa' && (
                <div className="space-y-3 py-1">
                  <Input
                    label="Enter Virtual Payment Address (VPA)"
                    placeholder="e.g. user@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                  />
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1.5 font-medium">
                      Demo suggestions:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['demo@okhdfcbank', 'demo@upi', 'user@paytm'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setUpiId(preset)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Never enter your UPI PIN or confidential passwords.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* METHOD 2: CARD CHECKOUT */}
          {selectedMethod === 'Card' && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Card Information</span>
                <button
                  type="button"
                  onClick={handleFillTestCard}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 underline underline-offset-2"
                >
                  <Zap className="h-3 w-3" />
                  Fill Demo Card
                </button>
              </div>

              <Input
                label="Cardholder Name"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Demo User"
                required
              />

              <Input
                label="Card Number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4242 4242 4242 4242"
                leftIcon={<CreditCard className="h-4 w-4 text-slate-400" />}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Expiry Date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                  required
                />
                <Input
                  label="CVV / CVC"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  placeholder="123"
                  leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
                  required
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Card data is never persisted or transmitted to payment gateways.
              </p>
            </div>
          )}

          {/* METHOD 3: NET BANKING */}
          {selectedMethod === 'Net Banking' && (
            <div className="space-y-3 pt-1">
              <span className="text-xs font-semibold text-slate-700 block">
                Select Demonstration Bank
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Bank', 'Other Bank'].map(
                  (bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`p-3 rounded-xl border text-center text-xs font-semibold transition-all ${
                        selectedBank === bank
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <Building2 className="h-4 w-4 mx-auto mb-1 text-slate-500" />
                      {bank}
                    </button>
                  )
                )}
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Visual demonstration only &bull; No connection to real banking portals.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full justify-center shadow-md shadow-indigo-600/10 font-bold"
              onClick={handleTriggerPayment}
              leftIcon={<Lock className="h-4 w-4" />}
            >
              Pay {formatCurrency(invoice.totalAmount, invoice.currency)}
            </Button>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Simulated demonstration checkout
              </span>
              {/* Safe trigger to test demo failure state */}
              <button
                type="button"
                onClick={() => setFlowState('failed')}
                className="text-slate-400 hover:text-slate-600 underline"
              >
                Simulate failure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. PROCESSING LOADING STATE */}
      {/* ================================================================= */}
      {flowState === 'processing' && (
        <div className="py-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 animate-spin">
            <RotateCcw className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Processing Simulated Payment...
            </h3>
            <p className="text-xs text-slate-500">
              Validating test transaction through BillFlow Pay
            </p>
          </div>
          <div className="max-w-xs mx-auto w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full w-2/3 animate-pulse" />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. PAYMENT SUCCESS STATE */}
      {/* ================================================================= */}
      {flowState === 'success' && (
        <div className="py-4 space-y-5 text-center">
          {/* Success Check Medallion */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50 shadow-sm">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
              Payment Successful
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">
              Demo payment completed
            </h3>
            <p className="text-xs text-slate-500">
              Thank you! Your simulated test payment has been recorded.
            </p>
          </div>

          {/* Receipt Details Box */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 text-xs space-y-2.5 text-left">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Amount:</span>
              <span className="text-base font-extrabold text-slate-900 tabular-nums">
                {formatCurrency(invoice.totalAmount, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Method:</span>
              <span className="font-semibold text-slate-900">{selectedMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reference:</span>
              <span className="font-mono font-bold text-slate-900">{referenceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                Paid
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200/70 pt-2 text-[11px] text-slate-400">
              <span>Type:</span>
              <span>Demo Transaction</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="flex-1 justify-center"
              onClick={() => {
                if (typeof window !== 'undefined') window.print();
              }}
              leftIcon={<Receipt className="h-4 w-4" />}
            >
              Print Receipt
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="flex-1 justify-center"
              onClick={onClose}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Back to Invoice
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. PAYMENT FAILURE STATE */}
      {/* ================================================================= */}
      {flowState === 'failed' && (
        <div className="py-6 space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50 shadow-sm">
            <AlertCircle className="h-10 w-10" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">Payment Failed</h3>
            <p className="text-xs text-rose-600 font-semibold">
              No payment was processed.
            </p>
            <p className="text-xs text-slate-500">
              The test issuer declined the transaction or simulated validation failed.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setFlowState('form')}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Try Again
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
            >
              Back to Invoice
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
