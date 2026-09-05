'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, SearchX, Plus } from 'lucide-react';
import { InvoiceFilterBar } from './InvoiceFilterBar';
import { InvoiceTable } from './InvoiceTable';
import { InvoiceCard } from './InvoiceCard';
import { InvoiceSkeleton } from './InvoiceSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { Client, Invoice, InvoiceFilters, InvoiceStatus } from '@/lib/types';
import { invoiceService } from '@/lib/services/invoiceService';
import { clientService } from '@/lib/services/clientService';

export function InvoiceList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL query params on initial load
  const initialStatusParam = searchParams.get('status') as InvoiceStatus | 'all' | null;
  const initialClientIdParam = searchParams.get('clientId') || undefined;

  const [filters, setFilters] = React.useState<InvoiceFilters>({
    status: initialStatusParam || 'all',
    clientId: initialClientIdParam,
    search: '',
    sortBy: 'newest',
  });

  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [statusCounts, setStatusCounts] = React.useState<Record<InvoiceStatus | 'all', number>>({
    all: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Sync URL search params if query changes externally
  React.useEffect(() => {
    const urlStatus = searchParams.get('status') as InvoiceStatus | 'all' | null;
    const urlClientId = searchParams.get('clientId') || undefined;

    setFilters((prev) => {
      let changed = false;
      const next = { ...prev };
      if (urlStatus && urlStatus !== prev.status) {
        next.status = urlStatus;
        changed = true;
      }
      if (urlClientId !== undefined && urlClientId !== prev.clientId) {
        next.clientId = urlClientId;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [searchParams]);

  // Load clients once for filter dropdown
  React.useEffect(() => {
    let isMounted = true;
    clientService.getClients().then((c) => {
      if (isMounted) setClients(c);
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch invoices through service layer with single query returning items and total
  const fetchInvoices = React.useCallback(async (activeFilters: InvoiceFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const { items: fetchedInvoices, total } = await invoiceService.getInvoicesWithMetadata(activeFilters);
      setInvoices(fetchedInvoices);
      setTotalCount(total);

      // Compute status distribution from loaded data when in default view
      if (!activeFilters.status || activeFilters.status === 'all') {
        const counts: Record<InvoiceStatus | 'all', number> = {
          all: total,
          draft: 0,
          sent: 0,
          paid: 0,
          overdue: 0,
        };
        fetchedInvoices.forEach((inv) => {
          if (inv.status in counts) {
            counts[inv.status as InvoiceStatus]++;
          }
        });
        setStatusCounts(counts);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load invoices.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInvoices(filters);
  }, [fetchInvoices, filters]);

  const handleFilterChange = (newFilters: Partial<InvoiceFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      clientId: undefined,
      search: '',
      sortBy: 'newest',
    });
  };

  const isFiltered = Boolean(
    filters.search ||
      (filters.status && filters.status !== 'all') ||
      filters.clientId
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search & Filter Bar */}
      <InvoiceFilterBar
        filters={filters}
        clients={clients}
        totalCount={totalCount}
        filteredCount={invoices.length}
        statusCounts={statusCounts}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Loading Shimmer State */}
      {isLoading && <InvoiceSkeleton />}

      {/* Error State */}
      {!isLoading && error && (
        <ErrorState
          title="Unable to load invoices"
          message={error}
          onRetry={() => fetchInvoices(filters)}
        />
      )}

      {/* Empty State: Filter Mismatch */}
      {!isLoading && !error && invoices.length === 0 && isFiltered && (
        <EmptyState
          icon={SearchX}
          title="No invoices found"
          description="No invoices match your current search and filter criteria. Try adjusting your filters or search term."
          actionLabel="Clear Filters"
          onAction={handleClearFilters}
        />
      )}

      {/* Empty State: Zero Invoices in Workspace */}
      {!isLoading && !error && invoices.length === 0 && !isFiltered && (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Create your first invoice to bill clients and start tracking payments."
          actionLabel="+ Create Invoice"
          onAction={() => router.push('/invoices/new')}
        />
      )}

      {/* Loaded Table & Mobile Cards */}
      {!isLoading && !error && invoices.length > 0 && (
        <>
          {/* Desktop View */}
          <InvoiceTable invoices={invoices} />

          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {invoices.map((inv) => (
              <InvoiceCard key={inv.id} invoice={inv} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
