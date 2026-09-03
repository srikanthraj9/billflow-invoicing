import * as React from 'react';
import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { InvoiceForm } from '@/components/invoices/InvoiceForm';

export const metadata: Metadata = {
  title: 'Create Invoice — BillFlow',
  description: 'Create and customize a professional invoice with dynamic line items, taxes, and discounts.',
};

export default function NewInvoicePage() {
  return (
    <AppLayout>
      <div className="py-2 sm:py-4">
        <InvoiceForm />
      </div>
    </AppLayout>
  );
}
