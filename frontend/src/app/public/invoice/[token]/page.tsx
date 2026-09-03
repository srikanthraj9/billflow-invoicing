'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { PublicInvoicePortal, PublicInvoiceSkeleton } from '@/components/public-invoice';
import { Invoice, BusinessSettings } from '@/lib/types';
import { publicInvoiceService } from '@/lib/services/publicInvoiceService';

export default function PublicInvoicePage() {
  const params = useParams();
  const token = params?.token as string;

  const [invoice, setInvoice] = React.useState<Invoice | null>(null);
  const [business, setBusiness] = React.useState<Partial<BusinessSettings> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    publicInvoiceService
      .getPublicInvoice(token)
      .then((data) => {
        if (!isMounted) return;
        if (!data) {
          setError('This invoice link is not available, expired, or does not exist.');
        } else {
          setInvoice(data.invoice);
          setBusiness(data.business);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Unable to load invoice.';
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  if (isLoading) {
    return <PublicInvoiceSkeleton />;
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200/90 shadow-sm text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900">Invoice Link Invalid</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              {error || 'This invoice link may be invalid or expired. Please request a new link from your billing contact.'}
            </p>
          </div>

          <div className="pt-2">
            <Link href="/">
              <Button variant="outline" size="md" className="w-full justify-center" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Return to BillFlow
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <PublicInvoicePortal initialInvoice={invoice} business={business || undefined} />;
}
