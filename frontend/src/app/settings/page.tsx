import * as React from 'react';
import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { SettingsContainer } from '@/components/settings';

export const metadata: Metadata = {
  title: 'Settings — BillFlow',
  description: 'Manage your business identity, branding, currency, and invoice preferences.',
};

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="py-2 sm:py-4">
        <SettingsContainer />
      </div>
    </AppLayout>
  );
}
