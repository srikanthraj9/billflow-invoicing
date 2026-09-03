import * as React from 'react';
import { Receipt, Printer, Download, Share2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

export function InvoicePreviewSection() {
  const lineItems = [
    {
      description: 'Consulting Services — Design System Architecture & Component Tokens',
      quantity: 1,
      rate: 25000,
      amount: 25000,
    },
    {
      description: 'Product Development — Next.js App Router Integration & TypeScript Models',
      quantity: 1,
      rate: 10000,
      amount: 10000,
    },
    {
      description: 'Design Services — Responsive UI & Accessibility Audit',
      quantity: 1,
      rate: 6300,
      amount: 6300,
    },
  ];

  const subtotal = 41300;
  const taxPercentage = 18;
  const taxAmount = 7434;
  const totalAmount = 48734;

  return (
    <section className="py-20 md:py-28 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">
            Invoice Experience
          </h2>
          <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Invoices your clients will actually appreciate receiving.
          </p>
          <p className="mt-4 text-base text-slate-600">
            Clean, professional, and mobile-friendly invoices designed to establish trust and
            accelerate client payments.
          </p>
        </div>

        {/* Invoice Container Mockup */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xl shadow-slate-900/5">
          {/* Top Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-8 border-b border-slate-100 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  Alex Morgan Design Studio
                </span>
                <p className="text-xs text-slate-500">billing@alexmorganstudio.com</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="sent" size="md">
                Status: Sent
              </Badge>
              <div className="hidden sm:flex items-center gap-1.5 ml-2">
                <span className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <Printer className="h-4 w-4" />
                </span>
                <span className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <Download className="h-4 w-4" />
                </span>
                <span className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <Share2 className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-8 border-b border-slate-100 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Invoice Number
              </span>
              <p className="font-bold text-slate-900 text-base">INV-0001</p>
              <p className="text-xs text-slate-500 mt-1">Issue Date: Sep 01, 2026</p>
              <p className="text-xs text-rose-600 font-medium">Due Date: Sep 15, 2026</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Billed To
              </span>
              <p className="font-bold text-slate-900">Acme Technologies</p>
              <p className="text-xs text-slate-600 mt-0.5">Attn: Sarah Jenkins</p>
              <p className="text-xs text-slate-500 mt-0.5">sarah.j@acmetech.io</p>
              <p className="text-xs text-slate-500">Cyber City Phase 2, Gurugram 122002</p>
            </div>

            <div className="sm:col-span-2 lg:col-span-1 rounded-xl bg-slate-50 p-4 border border-slate-100 flex flex-col justify-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Amount Due
              </span>
              <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
                {formatCurrency(totalAmount, 'INR')}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Zero-login client payment enabled</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-center w-20">Qty</th>
                  <th className="pb-3 text-right w-28">Rate</th>
                  <th className="pb-3 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3.5 pr-4 font-medium text-slate-900">{item.description}</td>
                    <td className="py-3.5 text-center text-slate-600 tabular-nums">{item.quantity}</td>
                    <td className="py-3.5 text-right text-slate-600 tabular-nums">
                      {formatCurrency(item.rate, 'INR')}
                    </td>
                    <td className="py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(item.amount, 'INR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="max-w-xs text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Payment Notes:</p>
              <p>Payment is due within 14 days of invoice date via wire transfer or public link.</p>
            </div>

            <div className="w-full sm:w-64 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {formatCurrency(subtotal, 'INR')}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST / Tax ({taxPercentage}%):</span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {formatCurrency(taxAmount, 'INR')}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-bold text-slate-900">
                <span>Total Due:</span>
                <span className="text-indigo-600 tabular-nums">
                  {formatCurrency(totalAmount, 'INR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
