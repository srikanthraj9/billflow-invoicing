'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ClientList } from '@/components/clients/ClientList';
import { clientService } from '@/lib/services/clientService';
import { Client } from '@/lib/types';

export default function ClientsPage() {
  const [clients, setClients] = React.useState<Client[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const fetchClients = React.useCallback(async (query = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await clientService.getClients({ search: query });
      setClients(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to fetch client directory.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchClients(searchQuery);
  }, [fetchClients, searchQuery]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Clients"
          description="Manage your clients and keep their billing information organized."
          actions={
            <Link href="/clients/new">
              <Button variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
                Add client
              </Button>
            </Link>
          }
        />

        {/* Client Directory Container */}
        <ClientList
          clients={clients}
          isLoading={isLoading}
          error={error}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          onRefresh={() => fetchClients(searchQuery)}
        />
      </div>
    </AppLayout>
  );
}
