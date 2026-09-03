'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, FileText, Send, UserPlus, AlertCircle, Building, Mail } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { LineItemsEditor } from './LineItemsEditor';
import { InvoiceSummary } from './InvoiceSummary';
import { InvoiceFormSkeleton } from './InvoiceFormSkeleton';
import { Client, Invoice, InvoiceItem, CurrencyCode } from '@/lib/types';
import { calculateInvoiceTotals } from '@/lib/utils';
import { clientService } from '@/lib/services/clientService';
import { invoiceService } from '@/lib/services/invoiceService';
import { settingsService } from '@/lib/services/settingsService';

export interface InvoiceFormProps {
  initialInvoice?: Invoice;
  isEditing?: boolean;
}

export function InvoiceForm({ initialInvoice, isEditing = false }: InvoiceFormProps = {}) {
  const router = useRouter();
  const toast = useToast();

  const [clients, setClients] = React.useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = React.useState(true);

  // Form state
  const [selectedClientId, setSelectedClientId] = React.useState(initialInvoice?.clientId || '');
  const [invoiceNumber, setInvoiceNumber] = React.useState(initialInvoice?.invoiceNumber || '');
  const [issueDate, setIssueDate] = React.useState(initialInvoice?.issueDate || '');
  const [dueDate, setDueDate] = React.useState(initialInvoice?.dueDate || '');
  const [items, setItems] = React.useState<InvoiceItem[]>(
    initialInvoice?.items && initialInvoice.items.length > 0
      ? initialInvoice.items
      : [
          {
            id: `item_1`,
            description: '',
            quantity: 1,
            rate: 0,
            amount: 0,
          },
        ]
  );
  const [discountPercentage, setDiscountPercentage] = React.useState(
    initialInvoice?.discountPercentage || 0
  );
  const [taxPercentage, setTaxPercentage] = React.useState(
    initialInvoice?.taxPercentage !== undefined ? initialInvoice.taxPercentage : 18
  );
  const [notes, setNotes] = React.useState(
    initialInvoice?.notes !== undefined
      ? initialInvoice.notes
      : 'Thank you for your business. Payment is due within the specified terms.'
  );
  const [currency, setCurrency] = React.useState<CurrencyCode>(initialInvoice?.currency || 'INR');

  // Submission & Validation state
  const [errors, setErrors] = React.useState<{
    clientId?: string;
    invoiceNumber?: string;
    dueDate?: string;
    items?: Record<number, { description?: string; quantity?: string; rate?: string }>;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittingStatus, setSubmittingStatus] = React.useState<'draft' | 'sent' | null>(null);

  // Initialize dates, invoice number, and merchant settings
  React.useEffect(() => {
    let isMounted = true;

    if (isEditing && initialInvoice) {
      clientService
        .getClients()
        .then((fetchedClients) => {
          if (!isMounted) return;
          setClients(fetchedClients);
          if (initialInvoice.clientId) {
            setSelectedClientId((prev) => prev || initialInvoice.clientId);
          }
        })
        .catch((err) => {
          console.error('Failed to load clients for editing:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoadingClients(false);
        });
      return () => {
        isMounted = false;
      };
    }

    // Creating NEW invoice: query clients, next sequence number, and merchant settings
    const today = new Date();
    const issueStr = today.toISOString().split('T')[0];
    setIssueDate((prev) => prev || issueStr);

    Promise.all([
      clientService.getClients(),
      invoiceService.getNextInvoiceNumber(),
      settingsService.getSettings().catch(() => null),
    ])
      .then(([fetchedClients, nextNum, settings]) => {
        if (!isMounted) return;
        setClients(fetchedClients);
        setInvoiceNumber((prev) => prev || nextNum);
        if (fetchedClients.length > 0) {
          setSelectedClientId((prev) => prev || fetchedClients[0].id);
        }

        // Auto-populate merchant defaults if user hasn't modified them
        if (settings) {
          if (settings.currency) {
            setCurrency((prev) => prev || settings.currency || 'INR');
          }
          if (settings.defaultTaxPercentage !== undefined && settings.defaultTaxPercentage !== null) {
            setTaxPercentage((prev) => (prev === 18 ? (settings.defaultTaxPercentage ?? 18) : prev));
          }
          const termsDays = settings.defaultPaymentTermsDays ?? 14;
          const due = new Date();
          due.setDate(due.getDate() + termsDays);
          const defaultDueStr = due.toISOString().split('T')[0];
          setDueDate((prev) => prev || defaultDueStr);
        } else {
          const due = new Date();
          due.setDate(due.getDate() + 14);
          setDueDate((prev) => prev || due.toISOString().split('T')[0]);
        }
      })
      .catch((err) => {
        console.error('Initialization error:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingClients(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isEditing, initialInvoice]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const validate = () => {
    const errs: {
      clientId?: string;
      invoiceNumber?: string;
      dueDate?: string;
      items?: Record<number, { description?: string; quantity?: string; rate?: string }>;
    } = {};

    if (!selectedClientId) {
      errs.clientId = 'Please select a client to bill.';
    }

    if (!invoiceNumber.trim()) {
      errs.invoiceNumber = 'Invoice number is required.';
    }

    if (!issueDate) {
      errs.dueDate = 'Issue date is required.';
    }

    if (!dueDate) {
      errs.dueDate = 'Due date is required.';
    } else if (issueDate && new Date(dueDate) < new Date(issueDate)) {
      errs.dueDate = 'Due date cannot be earlier than issue date.';
    }

    // Line items validation
    const itemErrors: Record<number, { description?: string; quantity?: string; rate?: string }> = {};
    let hasItemErrors = false;

    if (items.length === 0) {
      hasItemErrors = true;
    } else {
      items.forEach((item, idx) => {
        const iErr: { description?: string; quantity?: string; rate?: string } = {};
        if (!item.description.trim()) {
          iErr.description = 'Description is required.';
          hasItemErrors = true;
        }
        if (item.quantity <= 0) {
          iErr.quantity = 'Qty must be > 0.';
          hasItemErrors = true;
        }
        if (item.rate < 0) {
          iErr.rate = 'Rate cannot be negative.';
          hasItemErrors = true;
        }
        if (Object.keys(iErr).length > 0) {
          itemErrors[idx] = iErr;
        }
      });
    }

    if (hasItemErrors) {
      errs.items = itemErrors;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (status: 'draft' | 'sent') => {
    setErrors({});

    if (!validate()) {
      toast.error('Validation Error', 'Please correct the highlighted fields before saving.');
      return;
    }

    if (!selectedClient) return;

    setIsSubmitting(true);
    setSubmittingStatus(status);

    const totals = calculateInvoiceTotals(items, discountPercentage, taxPercentage);

    try {
      if (isEditing && initialInvoice?.id) {
        await invoiceService.updateInvoice(initialInvoice.id, {
          clientId: selectedClient.id,
          issueDate,
          dueDate,
          items,
          discountAmount: totals.discountAmount,
          taxPercentage,
          notes: notes.trim() || undefined,
          status,
        });

        const actionText = status === 'sent' ? 'Updated & Sent' : 'Saved';
        toast.success(`Invoice ${actionText}`, `Invoice ${invoiceNumber} has been updated.`);
        router.push(`/invoices/${initialInvoice.id}`);
      } else {
        await invoiceService.createInvoice({
          invoiceNumber: invoiceNumber.trim(),
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          clientCompany: selectedClient.company,
          clientEmail: selectedClient.email,
          clientAddress: selectedClient.address,
          issueDate,
          dueDate,
          items,
          subtotal: totals.subtotal,
          discountPercentage,
          discountAmount: totals.discountAmount,
          taxPercentage,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          currency,
          notes: notes.trim() || undefined,
          status,
          sentAt: status === 'sent' ? new Date().toISOString() : undefined,
        });

        const actionText = status === 'sent' ? 'Created & Dispatched' : 'Saved as Draft';
        toast.success(`Invoice ${actionText}`, `Invoice ${invoiceNumber} has been recorded.`);
        router.push('/invoices');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save invoice.';
      setErrors({ general: msg });
      toast.error('Save Failed', msg);
      setIsSubmitting(false);
      setSubmittingStatus(null);
    }
  };

  if (isLoadingClients) {
    return <InvoiceFormSkeleton />;
  }

  // Zero-clients empty state fallback
  if (clients.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <EmptyState
          icon={UserPlus}
          title="No clients available"
          description="You need to add at least one client profile before creating an invoice."
          actionLabel="+ Add Client"
          onAction={() => router.push('/clients/new')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <Link
          href={isEditing && initialInvoice ? `/invoices/${initialInvoice.id}` : '/invoices'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{isEditing ? 'Back to invoice' : 'Back to invoices'}</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <Link href={isEditing && initialInvoice ? `/invoices/${initialInvoice.id}` : '/invoices'}>
            <Button variant="outline" size="sm" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSave('draft')}
            isLoading={isSubmitting && submittingStatus === 'draft'}
            disabled={isSubmitting}
            leftIcon={<FileText className="h-3.5 w-3.5" />}
          >
            {isEditing ? 'Save draft changes' : 'Save draft'}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleSave('sent')}
            isLoading={isSubmitting && submittingStatus === 'sent'}
            disabled={isSubmitting}
            leftIcon={<Send className="h-3.5 w-3.5" />}
            className="shadow-xs"
          >
            {isEditing ? 'Save & send' : 'Create invoice'}
          </Button>
        </div>
      </div>

      {/* General Error Banner */}
      {errors.general && (
        <div
          className="rounded-xl bg-rose-50 p-4 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5 animate-in fade-in"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-semibold">{errors.general}</span>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Metadata & Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Client & Invoice Metadata */}
          <Card className="border border-slate-200/90 bg-white shadow-xs">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Invoice Details
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Bill To Client Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Bill to <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    if (errors.clientId) setErrors((prev) => ({ ...prev, clientId: undefined }));
                  }}
                  options={clients.map((c) => ({
                    value: c.id,
                    label: c.company ? `${c.name} (${c.company})` : c.name,
                  }))}
                  error={errors.clientId}
                  disabled={isSubmitting}
                />

                {/* Selected Client Info Pill */}
                {selectedClient && (
                  <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <span>{selectedClient.name}</span>
                      {selectedClient.company && (
                        <span className="text-slate-400 font-normal">• {selectedClient.company}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Mail className="h-3 w-3" />
                      <span>{selectedClient.email}</span>
                    </div>
                    {selectedClient.address && (
                      <p className="text-slate-500 text-[11px] pt-0.5">{selectedClient.address}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Invoice #, Issue Date, Due Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <Input
                  label="Invoice Number"
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    if (errors.invoiceNumber) setErrors((prev) => ({ ...prev, invoiceNumber: undefined }));
                  }}
                  placeholder="INV-0001"
                  error={errors.invoiceNumber}
                  disabled={isSubmitting}
                  required
                />

                <Input
                  label="Issue Date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  disabled={isSubmitting}
                  required
                />

                <Input
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: undefined }));
                  }}
                  error={errors.dueDate}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Interactive Line Items Builder */}
          <Card className="border border-slate-200/90 bg-white shadow-xs">
            <CardContent className="p-4 sm:p-6">
              <LineItemsEditor
                items={items}
                currency={currency}
                onChange={setItems}
                errors={errors.items}
                disabled={isSubmitting}
              />
            </CardContent>
          </Card>

          {/* Section 3: Notes */}
          <Card className="border border-slate-200/90 bg-white shadow-xs">
            <CardContent className="p-4 sm:p-6 space-y-2">
              <Textarea
                label="Invoice Notes & Payment Instructions"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Thank you for your business. Please remit payment via bank transfer or online portal."
                rows={3}
                disabled={isSubmitting}
                helperText="Optional terms, bank details, or thank you note visible on the invoice."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3): Financial Summary Card & Bottom Action Buttons */}
        <div className="space-y-6">
          <div className="sticky top-6 space-y-6">
            <InvoiceSummary
              items={items}
              discountPercentage={discountPercentage}
              taxPercentage={taxPercentage}
              currency={currency}
              onDiscountChange={setDiscountPercentage}
              onTaxChange={setTaxPercentage}
              disabled={isSubmitting}
            />

            {/* Action Buttons Box */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full justify-center shadow-sm shadow-indigo-600/10"
                onClick={() => handleSave('sent')}
                isLoading={isSubmitting && submittingStatus === 'sent'}
                disabled={isSubmitting}
                leftIcon={<Send className="h-4 w-4" />}
              >
                Create invoice
              </Button>

              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full justify-center"
                onClick={() => handleSave('draft')}
                isLoading={isSubmitting && submittingStatus === 'draft'}
                disabled={isSubmitting}
                leftIcon={<FileText className="h-4 w-4" />}
              >
                Save as draft
              </Button>

              <Link href="/invoices" className="block w-full">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-slate-500"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
