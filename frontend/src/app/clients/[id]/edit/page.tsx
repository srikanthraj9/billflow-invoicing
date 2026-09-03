'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ClientForm } from '@/components/clients/ClientForm';
import { ClientFormSkeleton } from '@/components/clients/ClientSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { clientService } from '@/lib/services/clientService';
import { Client } from '@/lib/types';

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const clientId = params?.id as string;

  const [client, setClient] = React.useState<Client | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!clientId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    clientService
      .getClientById(clientId)
      .then((data) => {
        if (!isMounted) return;
        if (!data) {
          setError('Client not found or may have been deleted.');
        } else {
          setClient(data);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Unable to load client data.';
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [clientId]);

  const handleUpdateClient = async (data: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    address?: string;
  }) => {
    await clientService.updateClient(clientId, data);
    toast.success('Client Updated', `${data.name}'s information has been updated.`);
    router.push('/clients');
  };

  return (
    <AppLayout>
      <div className="py-2 sm:py-4">
        {isLoading && <ClientFormSkeleton />}

        {!isLoading && error && (
          <div className="max-w-md mx-auto py-12">
            <ErrorState
              title="Client Not Found"
              message={error}
              onRetry={() => router.push('/clients')}
            />
            <div className="mt-4 text-center">
              <Link href="/clients">
                <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                  Return to Client Directory
                </Button>
              </Link>
            </div>
          </div>
        )}

        {!isLoading && !error && client && (
          <ClientForm
            initialData={client}
            onSubmit={handleUpdateClient}
            isEditing={true}
          />
        )}
      </div>
    </AppLayout>
  );
}
