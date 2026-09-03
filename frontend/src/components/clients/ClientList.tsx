'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Users, SearchX } from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useToast } from '@/components/ui/Toast';
import { ClientTable } from './ClientTable';
import { ClientCard } from './ClientCard';
import { ClientDirectorySkeleton } from './ClientSkeleton';
import { Client } from '@/lib/types';
import { clientService } from '@/lib/services/clientService';

export interface ClientListProps {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onClearSearch: () => void;
  onRefresh: () => void;
}

export function ClientList({
  clients,
  isLoading,
  error,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onRefresh,
}: ClientListProps) {
  const router = useRouter();
  const toast = useToast();
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);
    try {
      await clientService.deleteClient(clientToDelete.id);
      toast.success('Client Deleted', `${clientToDelete.name} has been removed.`);
      setClientToDelete(null);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to delete client.';
      if (
        msg.toLowerCase().includes('invoice') ||
        msg.toLowerCase().includes('conflict') ||
        msg.toLowerCase().includes('associated')
      ) {
        toast.error(
          'Client Has Invoices',
          'This client has existing invoices. Deletion is blocked to preserve billing and financial audit records.'
        );
      } else {
        toast.error('Deletion Failed', msg);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <ClientDirectorySkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load client directory"
        message={error}
        onRetry={onRefresh}
      />
    );
  }

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="w-full sm:max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onClear={onClearSearch}
            placeholder="Search clients by name, email, company, phone..."
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-200/80 shadow-2xs">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          </span>
          <Link href="/clients/new" className="sm:hidden">
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              Add Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Empty State: Search Mismatch */}
      {clients.length === 0 && isSearchActive && (
        <EmptyState
          icon={SearchX}
          title="No clients found"
          description={`No customer records matched your query "${searchQuery}". Try searching with a different term.`}
          actionLabel="Clear Search"
          onAction={onClearSearch}
        />
      )}

      {/* Empty State: Zero Clients in Directory */}
      {clients.length === 0 && !isSearchActive && (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first customer profile to start creating and dispatching invoices."
          actionLabel="+ Add Client"
          onAction={() => router.push('/clients/new')}
        />
      )}

      {/* Loaded Clients Content */}
      {clients.length > 0 && (
        <>
          {/* Desktop Table */}
          <ClientTable clients={clients} onDelete={(c) => setClientToDelete(c)} />

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onDelete={(c) => setClientToDelete(c)}
              />
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={Boolean(clientToDelete)}
        onClose={() => setClientToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        title={`Delete ${clientToDelete?.name}?`}
        description={`Are you sure you want to delete ${
          clientToDelete?.company ? `${clientToDelete.name} (${clientToDelete.company})` : clientToDelete?.name
        }? This action cannot be undone. Note: In accordance with accounting standards, clients associated with existing invoices cannot be deleted to preserve billing audit history.`}
        confirmText="Delete Client"
        cancelText="Cancel"
      />
    </div>
  );
}
