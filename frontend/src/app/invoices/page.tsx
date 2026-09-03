import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { InvoiceList, InvoiceSkeleton } from '@/components/invoices';

export default function InvoicesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Invoices"
          description="Create, track, and manage your invoices."
          actions={
            <Link href="/invoices/new">
              <Button variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
                Create invoice
              </Button>
            </Link>
          }
        />

        {/* Invoice List Container wrapped in Suspense for useSearchParams */}
        <React.Suspense fallback={<InvoiceSkeleton />}>
          <InvoiceList />
        </React.Suspense>
      </div>
    </AppLayout>
  );
}
