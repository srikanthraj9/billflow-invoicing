'use client';

import * as React from 'react';
import { Percent, Receipt } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CurrencyCode, InvoiceItem } from '@/lib/types';
import { calculateInvoiceTotals, formatCurrency } from '@/lib/utils';

export interface InvoiceSummaryProps {
  items: InvoiceItem[];
  discountPercentage: number;
  taxPercentage: number;
  currency?: CurrencyCode;
  onDiscountChange: (discount: number) => void;
  onTaxChange: (tax: number) => void;
  disabled?: boolean;
}

export function InvoiceSummary({
  items,
  discountPercentage,
  taxPercentage,
  currency = 'INR',
  onDiscountChange,
  onTaxChange,
  disabled = false,
}: InvoiceSummaryProps) {
  const totals = calculateInvoiceTotals(items, discountPercentage, taxPercentage);

  return (
    <Card className="border border-slate-200/90 bg-slate-50/50 shadow-xs">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-indigo-600" />
          <span>Payment Summary</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-4 text-xs sm:text-sm">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Subtotal:</span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {formatCurrency(totals.subtotal, currency)}
          </span>
        </div>

        {/* Discount Row */}
        <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Discount:</span>
            <div className="w-24">
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={discountPercentage === 0 ? '' : discountPercentage}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  onDiscountChange(Math.max(0, Math.min(100, val)));
                }}
                placeholder="0"
                rightIcon={<Percent className="h-3.5 w-3.5 text-slate-400" />}
                disabled={disabled}
                className="text-xs text-right h-8"
              />
            </div>
          </div>

          {totals.discountAmount > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-600 font-medium">
              <span>Discount applied:</span>
              <span className="tabular-nums">- {formatCurrency(totals.discountAmount, currency)}</span>
            </div>
          )}
        </div>

        {/* Tax Row */}
        <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Tax / GST:</span>
            <div className="w-24">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={taxPercentage === 0 ? '' : taxPercentage}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  onTaxChange(Math.max(0, val));
                }}
                placeholder="0"
                rightIcon={<Percent className="h-3.5 w-3.5 text-slate-400" />}
                disabled={disabled}
                className="text-xs text-right h-8"
              />
            </div>
          </div>

          {totals.taxAmount > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Tax ({taxPercentage}%):</span>
              <span className="tabular-nums">+ {formatCurrency(totals.taxAmount, currency)}</span>
            </div>
          )}
        </div>

        {/* Final Total Box */}
        <div className="mt-3 flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Total Due</span>
            <span className="text-[11px] text-slate-500 font-normal">All taxes & discounts applied</span>
          </div>
          <span className="text-xl sm:text-2xl font-extrabold text-indigo-600 tabular-nums tracking-tight">
            {formatCurrency(totals.totalAmount, currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
