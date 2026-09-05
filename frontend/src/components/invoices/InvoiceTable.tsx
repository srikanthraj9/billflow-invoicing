import * as React from 'react';
import Link from 'next/link';
import { Eye, ArrowRight } from 'lucide-react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Invoice } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface InvoiceTableProps {
  invoices: Invoice[];
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/60">
            <TableHead className="w-36">Invoice #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="w-32">Issue Date</TableHead>
            <TableHead className="w-32">Due Date</TableHead>
            <TableHead className="text-right w-36">Amount</TableHead>
            <TableHead className="text-center w-32">Status</TableHead>
            <TableHead className="text-right w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id} className="group hover:bg-slate-50/70 transition-colors">
              {/* Invoice Number */}
              <TableCell className="font-bold">
                <Link
                  href={`/invoices/${inv.id}`}
                  className="text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  <span>{inv.invoiceNumber}</span>
                </Link>
              </TableCell>

              {/* Client Name & Company */}
              <TableCell>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{inv.clientName}</p>
                  {inv.clientCompany && (
                    <p className="text-xs text-slate-500">{inv.clientCompany}</p>
                  )}
                </div>
              </TableCell>

              {/* Issue Date */}
              <TableCell className="text-xs text-slate-600">
                {formatDate(inv.issueDate)}
              </TableCell>

              {/* Due Date */}
              <TableCell className="text-xs text-slate-600">
                <span className={inv.status === 'overdue' ? 'text-rose-600 font-semibold' : ''}>
                  {formatDate(inv.dueDate)}
                </span>
              </TableCell>

              {/* Amount */}
              <TableCell className="text-right font-bold text-slate-900 tabular-nums text-sm">
                {formatCurrency(inv.totalAmount, inv.currency)}
              </TableCell>

              {/* Status Badge */}
              <TableCell className="text-center">
                <Badge variant={inv.status} size="sm">
                  {inv.status === 'paid' ? '✓ PAID' : inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                </Badge>
              </TableCell>

              {/* Action */}
              <TableCell className="text-right">
                <Link href={`/invoices/${inv.id}`}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors p-1.5 rounded-md hover:bg-indigo-50"
                    title={`View ${inv.invoiceNumber}`}
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
