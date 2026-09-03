'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ClientForm } from '@/components/clients/ClientForm';
import { useToast } from '@/components/ui/Toast';
import { clientService } from '@/lib/services/clientService';

export default function NewClientPage() {
  const router = useRouter();
  const toast = useToast();

  const handleCreateClient = async (data: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    address?: string;
  }) => {
    await clientService.createClient(data);
    toast.success('Client Added', `${data.name} has been added to your directory.`);
    router.push('/clients');
  };

  return (
    <AppLayout>
      <div className="py-2 sm:py-4">
        <ClientForm onSubmit={handleCreateClient} isEditing={false} />
      </div>
    </AppLayout>
  );
}
