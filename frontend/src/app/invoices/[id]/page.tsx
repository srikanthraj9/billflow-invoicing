'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Download, Share2, Send, Pencil, Trash2, Link2, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useToast } from '@/components/ui/Toast';
import { InvoiceDocument, ShareInvoiceModal, InvoiceDetailSkeleton, PaymentLinkModal } from '@/components/invoices';
import { Invoice, BusinessSettings } from '@/lib/types';
import { invoiceService } from '@/lib/services/invoiceService';
import { settingsService } from '@/lib/services/settingsService';
import { paymentService, AuthoritativePayment } from '@/lib/services/paymentService';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = React.useState<Invoice | null>(null);
  const [business, setBusiness] = React.useState<BusinessSettings | null>(null);
  const [paymentRecord, setPaymentRecord] = React.useState<AuthoritativePayment | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [paymentLinkModalOpen, setPaymentLinkModalOpen] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!invoiceId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

      Promise.all([
        invoiceService.getInvoiceById(invoiceId),
        settingsService.getSettings(),
        paymentService.getPaymentForInvoice(invoiceId),
      ])
        .then(([inv, biz, pay]) => {
          if (!isMounted) return;
          if (!inv) {
            setError('Invoice not found or may have been removed.');
          } else {
            setInvoice(inv);
            setBusiness(biz);
            setPaymentRecord(pay);
          }
        })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Unable to load invoice details.';
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [invoiceId]);

  const handleMarkAsSent = async () => {
    if (!invoice || invoice.status !== 'draft') return;
    setIsSending(true);
    try {
      const updated = await invoiceService.updateInvoice(invoice.id, { status: 'sent' });
      setInvoice(updated);
      toast.success('Invoice Sent', `Invoice ${updated.invoiceNumber} has been dispatched and marked as Sent.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to mark invoice as sent.';
      toast.error('Send Failed', msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice || invoice.status !== 'draft') return;
    setIsDeleting(true);
    try {
      await invoiceService.deleteInvoice(invoice.id);
      toast.success('Invoice Deleted', `Draft invoice ${invoice.invoiceNumber} has been deleted.`);
      router.push('/invoices');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to delete draft invoice.';
      toast.error('Delete Failed', msg);
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadPdf = () => {
    toast.info('Preparing PDF Document', 'Opening print preview. Choose "Save as PDF" to download.');
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.print();
      }
    }, 400);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Loading State */}
        {isLoading && <InvoiceDetailSkeleton />}

        {/* Not Found / Error State */}
        {!isLoading && error && (
          <div className="max-w-md mx-auto py-12">
            <ErrorState
              title="Invoice Not Found"
              message={error}
              onRetry={() => router.push('/invoices')}
            />
            <div className="mt-4 text-center">
              <Link href="/invoices">
                <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                  Return to invoices
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Loaded Invoice View */}
        {!isLoading && !error && invoice && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Top Header & Actions Bar (Hidden during print) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 print:hidden">
              <div className="flex items-center gap-3">
                <Link
                  href="/invoices"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to invoices</span>
                </Link>
                <span className="text-slate-300">•</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {invoice.invoiceNumber}
                </span>
                <Badge variant={invoice.status} size="sm">
                  {invoice.status.toUpperCase()}
                </Badge>
              </div>

              {/* Status-Aware Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Draft Status Specific Actions */}
                {invoice.status === 'draft' ? (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleMarkAsSent}
                      isLoading={isSending}
                      leftIcon={<Send className="h-4 w-4" />}
                      className="shadow-xs"
                    >
                      Mark as Sent
                    </Button>

                    <Link href={`/invoices/${invoice.id}/edit`}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Pencil className="h-3.5 w-3.5" />}
                      >
                        Edit
                      </Button>
                    </Link>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPdf}
                      leftIcon={<Download className="h-4 w-4" />}
                      title="Print or save invoice as PDF"
                    >
                      Print / PDF
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteModalOpen(true)}
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                    >
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Non-Draft Actions (Sent, Paid, Overdue) */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      leftIcon={<Printer className="h-4 w-4" />}
                    >
                      Print
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPdf}
                      leftIcon={<Download className="h-4 w-4" />}
                      title="Print or save invoice as PDF"
                    >
                      Print / Save PDF
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setShareModalOpen(true)}
                      leftIcon={<Share2 className="h-4 w-4" />}
                      className="shadow-xs"
                    >
                      Share link
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentLinkModalOpen(true)}
                      leftIcon={<Link2 className="h-3.5 w-3.5" />}
                    >
                      Payment Link
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Authoritative Payment Completed Panel */}
            {invoice.status === 'paid' && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6 shadow-2xs space-y-4 print:hidden animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="font-bold text-emerald-950 text-base">Payment Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Payment Status:</span>
                    <Badge variant="paid" size="sm">✓ PAID</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs pt-1 border-t border-emerald-200/60">
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Amount Paid</span>
                    <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                      {formatCurrency(paymentRecord?.amount ?? invoice.totalAmount, invoice.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Payment Method</span>
                    <span className="font-semibold text-slate-800">
                      {paymentRecord?.method || invoice.paymentMethod || 'UPI'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Payment Reference</span>
                    <span className="font-mono font-bold text-slate-800">
                      {paymentRecord?.reference || invoice.paymentReference || `BF-${invoice.invoiceNumber}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Paid At</span>
                    <span className="font-medium text-slate-800">
                      {paymentRecord?.paidAt
                        ? formatDate(paymentRecord.paidAt)
                        : (invoice.paidAt ? formatDate(invoice.paidAt) : formatDate(invoice.updatedAt || invoice.issueDate))}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Invoice Number</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {invoice.invoiceNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Customer</span>
                    <span className="font-semibold text-slate-800 truncate block" title={invoice.clientName}>
                      {invoice.clientName}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <p className="text-[11px] text-slate-500">
                    Internal settlement representation &bull; Recorded in authoritative invoice register
                  </p>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      leftIcon={<Printer className="h-3.5 w-3.5" />}
                      className="bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    >
                      Print Receipt
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handlePrint}
                      leftIcon={<Download className="h-3.5 w-3.5" />}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                    >
                      View Receipt
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Printable Invoice Sheet */}
            <InvoiceDocument invoice={invoice} business={business || undefined} />

            {/* Share Link Modal */}
            <ShareInvoiceModal
              isOpen={shareModalOpen}
              onClose={() => setShareModalOpen(false)}
              invoice={invoice}
            />

            {/* Payment Link Modal */}
            <PaymentLinkModal
              isOpen={paymentLinkModalOpen}
              onClose={() => setPaymentLinkModalOpen(false)}
              invoice={invoice}
            />

            {/* Delete Draft Confirmation Modal */}
            <ConfirmationDialog
              isOpen={deleteModalOpen}
              onClose={() => setDeleteModalOpen(false)}
              onConfirm={handleDeleteInvoice}
              isLoading={isDeleting}
              title={`Delete Draft ${invoice.invoiceNumber}?`}
              description={`Are you sure you want to permanently delete draft invoice ${invoice.invoiceNumber}? This action cannot be undone.`}
              confirmText="Delete Draft"
              cancelText="Cancel"
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
