import * as React from 'react';
import Link from 'next/link';
import { Eye, Calendar, Building } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Invoice } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface InvoiceCardProps {
  invoice: Invoice;
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  return (
    <Card className="border border-slate-200/90 bg-white shadow-xs md:hidden">
      <CardContent className="p-4 sm:p-5 space-y-3">
        {/* Top Header: Number + Status */}
        <div className="flex items-center justify-between">
          <Link
            href={`/invoices/${invoice.id}`}
            className="text-sm font-bold text-indigo-600 hover:underline"
          >
            {invoice.invoiceNumber}
          </Link>
          <Badge variant={invoice.status} size="sm">
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Badge>
        </div>

        {/* Client & Amount */}
        <div className="flex items-start justify-between gap-2 pt-1">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 truncate">{invoice.clientName}</h3>
            {invoice.clientCompany && (
              <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <Building className="h-3 w-3 shrink-0" />
                <span>{invoice.clientCompany}</span>
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="text-base font-bold text-slate-900 tabular-nums block">
              {formatCurrency(invoice.totalAmount, invoice.currency)}
            </span>
          </div>
        </div>

        {/* Dates & Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className={invoice.status === 'overdue' ? 'text-rose-600 font-medium' : ''}>
              Due {formatDate(invoice.dueDate)}
            </span>
          </div>

          <Link href={`/invoices/${invoice.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2.5"
              leftIcon={<Eye className="h-3 w-3" />}
            >
              View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
