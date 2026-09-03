'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { InvoiceForm } from '@/components/invoices/InvoiceForm';
import { InvoiceFormSkeleton } from '@/components/invoices/InvoiceFormSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { Invoice } from '@/lib/types';
import { invoiceService } from '@/lib/services/invoiceService';

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = React.useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!invoiceId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    invoiceService
      .getInvoiceById(invoiceId)
      .then((data) => {
        if (!isMounted) return;
        if (!data) {
          setError('Invoice not found or may have been removed.');
        } else {
          setInvoice(data);
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

  return (
    <AppLayout>
      <div className="py-2 sm:py-4">
        {isLoading && <InvoiceFormSkeleton />}

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
                  Return to Invoices
                </Button>
              </Link>
            </div>
          </div>
        )}

        {!isLoading && !error && invoice && invoice.status !== 'draft' && (
          <div className="max-w-lg mx-auto py-12">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-4 shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900">
                  Editing Locked: {invoice.invoiceNumber}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Only invoices in <strong>Draft</strong> status can be modified. This invoice is
                  currently <strong>{invoice.status.toUpperCase()}</strong> to preserve financial audit
                  integrity.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Link href={`/invoices/${invoice.id}`}>
                  <Button variant="primary" size="sm">
                    View Invoice
                  </Button>
                </Link>
                <Link href="/invoices">
                  <Button variant="outline" size="sm">
                    Return to Invoices
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && invoice && invoice.status === 'draft' && (
          <InvoiceForm initialInvoice={invoice} isEditing={true} />
        )}
      </div>
    </AppLayout>
  );
}
