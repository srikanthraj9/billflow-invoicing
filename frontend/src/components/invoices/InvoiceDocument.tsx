'use client';

import * as React from 'react';
import { Building, Mail, Phone, MapPin, Receipt, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { Invoice, BusinessSettings } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface InvoiceDocumentProps {
  invoice: Invoice;
  business?: Partial<BusinessSettings>;
  className?: string;
}

export function InvoiceDocument({ invoice, business, className = '' }: InvoiceDocumentProps) {
  const businessName = business?.businessName?.trim() || 'BillFlow Merchant';
  const businessEmail = business?.businessEmail?.trim();
  const businessPhone = business?.businessPhone?.trim();
  const businessAddress = business?.businessAddress?.trim();
  const logoUrl = business?.logoUrl?.trim();

  return (
    <div
      id="invoice-document"
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_35px_rgba(15,23,42,0.05),0_1px_3px_rgba(15,23,42,0.03)] p-6 sm:p-10 md:p-12 space-y-8 print:border-0 print:shadow-none print:p-0 print:rounded-none print:text-black print:space-y-6 ${className}`}
    >
      {/* 1. Header: Business Branding & Invoice Title */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-6 border-b border-slate-100 print:border-slate-300">
        <div>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="h-10 w-auto max-w-[140px] object-contain rounded-lg"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-xs print:bg-slate-900">
                <Receipt className="h-5 w-5" />
              </div>
            )}
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 print:text-black block">
                {businessName}
              </span>
              <span className="text-[11px] font-medium text-slate-400 print:hidden">
                Official Commercial Invoice
              </span>
            </div>
          </div>
          {(businessAddress || businessEmail || businessPhone) && (
            <div className="mt-3.5 space-y-1 text-xs text-slate-500 print:text-slate-700 max-w-sm">
              {businessAddress && <p className="leading-relaxed">{businessAddress}</p>}
              {(businessEmail || businessPhone) && (
                <p className="flex items-center gap-2 pt-0.5 text-slate-500">
                  {businessEmail && <span>{businessEmail}</span>}
                  {businessEmail && businessPhone && <span>•</span>}
                  {businessPhone && <span>{businessPhone}</span>}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Invoice Number & Status */}
        <div className="text-left sm:text-right space-y-2">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block print:text-slate-600">
              Invoice Number
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono">
              {invoice.invoiceNumber}
            </h1>
          </div>
          <div className="flex items-center sm:justify-end gap-2 pt-1">
            <Badge variant={invoice.status} size="md">
              {invoice.status.toUpperCase()}
            </Badge>
          </div>
          {invoice.status === 'paid' && invoice.paidAt && (
            <p className="text-xs font-semibold text-emerald-600 flex items-center sm:justify-end gap-1 pt-0.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Paid on {formatDate(invoice.paidAt)}</span>
            </p>
          )}
        </div>
      </div>

      {/* 2. Client & Invoice Metadata Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs sm:text-sm">
        {/* Billed To */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Billed To:
          </span>
          <div className="space-y-1.5">
            <h2 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
              {invoice.clientName}
            </h2>
            {invoice.clientCompany && (
              <p className="font-medium text-slate-700 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                <span>{invoice.clientCompany}</span>
              </p>
            )}
            {invoice.clientEmail && (
              <p className="text-slate-500 flex items-center gap-1.5 pt-0.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{invoice.clientEmail}</span>
              </p>
            )}
            {invoice.clientAddress && (
              <p className="text-slate-500 leading-relaxed pt-1 max-w-xs text-xs">
                {invoice.clientAddress}
              </p>
            )}
          </div>
        </div>

        {/* Invoice Dates */}
        <div className="space-y-2.5 sm:text-right flex flex-col sm:items-end justify-start">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Invoice Details:
          </span>
          <div className="space-y-2 text-xs sm:text-sm w-full max-w-xs">
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-500">Issue Date:</span>
              <span className="font-semibold text-slate-900 tabular-nums">{formatDate(invoice.issueDate)}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-500">Payment Due:</span>
              <span
                className={`font-semibold tabular-nums ${
                  invoice.status === 'overdue' ? 'text-rose-600 font-bold' : 'text-slate-900'
                }`}
              >
                {formatDate(invoice.dueDate)}
              </span>
            </div>
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-500">Currency:</span>
              <span className="font-semibold text-slate-900">{invoice.currency || 'INR'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Line Items Table */}
      <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 border-b border-slate-200">
              <TableHead className="w-[50%] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Description
              </TableHead>
              <TableHead className="w-24 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Qty
              </TableHead>
              <TableHead className="w-32 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Rate
              </TableHead>
              <TableHead className="w-36 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item, index) => (
              <TableRow key={item.id || index} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="font-medium text-slate-900 py-3.5">
                  {item.description}
                </TableCell>
                <TableCell className="text-center text-slate-600 tabular-nums py-3.5">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-right text-slate-600 tabular-nums py-3.5">
                  {formatCurrency(item.rate, invoice.currency)}
                </TableCell>
                <TableCell className="text-right font-bold text-slate-900 tabular-nums py-3.5">
                  {formatCurrency(item.amount, invoice.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 4. Financial Summary Breakdown */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pt-2">
        {/* Notes & Payment Terms */}
        <div className="flex-1 max-w-md space-y-2 text-xs text-slate-500">
          {invoice.notes && (
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
              <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                Notes & Terms:
              </p>
              <p className="leading-relaxed text-slate-600">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Totals Box */}
        <div className="w-full sm:w-80 space-y-2.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {formatCurrency(invoice.subtotal, invoice.currency)}
            </span>
          </div>

          {invoice.discountAmount > 0 && (
            <div className="flex items-center justify-between text-emerald-600">
              <span>Discount ({invoice.discountPercentage}%):</span>
              <span className="font-semibold tabular-nums">
                - {formatCurrency(invoice.discountAmount, invoice.currency)}
              </span>
            </div>
          )}

          {invoice.taxAmount > 0 && (
            <div className="flex items-center justify-between text-slate-600">
              <span>Tax / GST ({invoice.taxPercentage}%):</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                + {formatCurrency(invoice.taxAmount, invoice.currency)}
              </span>
            </div>
          )}

          <div className="pt-3 border-t-2 border-slate-900 print:border-slate-800 flex items-baseline justify-between text-slate-900">
            <span className="text-base font-bold print:text-black">Total Due:</span>
            <span className="text-2xl font-extrabold text-indigo-600 print:text-black tabular-nums tracking-tight">
              {formatCurrency(invoice.totalAmount, invoice.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
