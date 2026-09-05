'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Send, Copy, Check, Info, AlertCircle, FilePlus, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { mockPaymentService } from '@/lib/services/mockPaymentService';
import { invoiceService } from '@/lib/services/invoiceService';
import { Invoice } from '@/lib/types';

export interface RequestPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentCreated?: () => void;
  invoices?: Invoice[];
}

export function RequestPaymentModal({ isOpen, onClose, onPaymentCreated, invoices: initialInvoices }: RequestPaymentModalProps) {
  const toast = useToast();
  const router = useRouter();

  const [invoices, setInvoices] = React.useState<Invoice[]>(initialInvoices || []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [invoiceNumber, setInvoiceNumber] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<'UPI' | 'Card' | 'Net Banking'>('UPI');
  const [generatedLink, setGeneratedLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (initialInvoices && initialInvoices.length > 0) {
      setInvoices(initialInvoices);
      return;
    }

    if (isOpen) {
      setIsLoading(true);
      invoiceService
        .getInvoices()
        .then((data) => {
          setInvoices(data || []);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, initialInvoices]);

  const handleInvoiceSelect = (invId: string) => {
    setSelectedInvoiceId(invId);
    const selected = invoices.find((i) => i.id === invId);
    if (selected) {
      setCustomerName(selected.clientName || 'Valued Client');
      setCustomerEmail(selected.clientEmail || '');
      setInvoiceNumber(selected.invoiceNumber);
      setAmount(selected.totalAmount.toString());
    } else {
      setCustomerName('');
      setCustomerEmail('');
      setInvoiceNumber('');
      setAmount('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      toast.error('Selection Required', 'Please select a real backend invoice.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!customerName.trim() || isNaN(numAmount) || numAmount <= 0) {
      toast.error('Validation Error', 'Invalid invoice information.');
      return;
    }

    const newLink = mockPaymentService.createPaymentLink({
      invoiceNumber: invoiceNumber.trim(),
      amount: numAmount,
      currency: 'INR',
    });

    setGeneratedLink(newLink.linkToken);
    toast.success('Payment Request Created', `Demo payment link generated for ${invoiceNumber}.`);
    if (onPaymentCreated) onPaymentCreated();
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Link Copied', 'Demo identifier copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info('Link Identifier', generatedLink);
    }
  };

  const handleReset = () => {
    setSelectedInvoiceId('');
    setCustomerName('');
    setCustomerEmail('');
    setInvoiceNumber('');
    setAmount('');
    setGeneratedLink(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title="Request Payment"
      description="Create a simulated payment request link using real backend invoices."
      maxWidth="md"
    >
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Loading backend invoices...
        </div>
      ) : invoices.length === 0 ? (
        <div className="py-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No invoices available</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create an invoice first to request payment.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => {
              handleReset();
              router.push('/invoices/new');
            }}
            leftIcon={<FilePlus className="h-4 w-4" />}
          >
            Create New Invoice
          </Button>
        </div>
      ) : !generatedLink ? (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
            <Info className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>Frontend demo mode — Select an authorized backend invoice to generate a request link.</span>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="select-backend-invoice" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Backend Invoice <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-backend-invoice"
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceSelect(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 shadow-2xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">-- Choose a real backend invoice --</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.clientName || 'Client'} — ₹{inv.totalAmount.toLocaleString('en-IN')} ({inv.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {selectedInvoiceId && (
              <>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Associated Backend Invoice Details
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Invoice Number</span>
                      <span className="font-mono font-semibold text-slate-900">{invoiceNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Amount</span>
                      <span className="font-bold text-slate-900">₹{Number(amount).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Client / Customer</span>
                      <span className="font-medium text-slate-800">{customerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Client Email</span>
                      <span className="text-slate-600 truncate block">{customerEmail || '—'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Preferred Demo Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['UPI', 'Card', 'Net Banking'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                          paymentMethod === method
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={handleReset}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!selectedInvoiceId}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Generate Demo Request
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 pt-2">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-1">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
              Demo Payment Request Ready
            </span>
            <p className="text-sm font-bold text-emerald-900">
              ₹{Number(amount).toLocaleString('en-IN')} for {customerName} ({invoiceNumber})
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Demo Payment Identifier
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 break-all select-all">
                {generatedLink}
              </div>
              <Button
                type="button"
                variant={copied ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleCopy}
                leftIcon={copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">
              Demo link associated with backend invoice <strong className="font-semibold">{invoiceNumber}</strong>. No real gateway is connected.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button type="button" variant="primary" size="md" onClick={handleReset}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

