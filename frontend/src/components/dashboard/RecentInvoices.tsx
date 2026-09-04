import * as React from 'react';
import Link from 'next/link';
import { FileText, ArrowRight, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Invoice } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface RecentInvoicesProps {
  invoices: Invoice[];
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  if (!invoices || invoices.length === 0) {
    return (
      <Card className="border border-slate-200/90 bg-white">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Recent Invoices</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Latest billing activity across your clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={FileText}
            title="No invoices created yet"
            description="Create your first invoice to start billing clients and tracking payments."
            actionLabel="Create Invoice"
            onAction={() => {}}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200/90 bg-white shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">Recent Invoices</CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Latest billing activity and payment statuses
          </CardDescription>
        </div>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <span>View all invoices</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-0 sm:p-0">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table containerClassName="border-0 rounded-none border-t border-slate-100">
            <TableHeader>
              <TableRow className="bg-slate-50/60">
                <TableHead className="w-32">Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="w-32">Issue Date</TableHead>
                <TableHead className="w-32">Due Date</TableHead>
                <TableHead className="text-right w-32">Amount</TableHead>
                <TableHead className="text-center w-28">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="group hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <TableCell className="font-bold text-slate-900">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="inline-flex items-center gap-1.5 text-indigo-600 group-hover:text-indigo-700 group-hover:underline"
                    >
                      <span>{inv.invoiceNumber}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                        {inv.clientName}
                      </p>
                      {inv.clientCompany && (
                        <p className="text-xs text-slate-500">{inv.clientCompany}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{formatDate(inv.issueDate)}</TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <span className={inv.status === 'overdue' ? 'text-rose-600 font-semibold' : ''}>
                      {formatDate(inv.dueDate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900 tabular-nums">
                    {formatCurrency(inv.totalAmount, inv.currency)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={inv.status} size="sm">
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Compact Cards View */}
        <div className="md:hidden divide-y divide-slate-100 border-t border-slate-100">
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors block"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600">{inv.invoiceNumber}</span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="truncate text-xs font-semibold text-slate-900">
                    {inv.clientName}
                  </span>
                </div>
                {inv.clientCompany && (
                  <p className="truncate text-[11px] text-slate-500 mt-0.5">{inv.clientCompany}</p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Due {formatDate(inv.dueDate)}
                </p>
              </div>

              <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {formatCurrency(inv.totalAmount, inv.currency)}
                </span>
                <Badge variant={inv.status} size="sm">
                  {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
