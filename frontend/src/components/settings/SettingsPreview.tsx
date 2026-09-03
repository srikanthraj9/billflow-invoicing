'use client';

import * as React from 'react';
import { Sparkles, Receipt, Building, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CurrencyCode } from '@/lib/types';
import { formatCurrency, formatInvoiceNumber } from '@/lib/utils';

export interface SettingsPreviewProps {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  logoUrl?: string;
  currency: CurrencyCode;
  invoicePrefix: string;
  defaultTaxPercentage?: number;
}

export function SettingsPreview({
  businessName,
  businessEmail,
  businessPhone,
  businessAddress,
  logoUrl,
  currency = 'INR',
  invoicePrefix = 'INV',
  defaultTaxPercentage = 18,
}: SettingsPreviewProps) {
  const sampleInvoiceNumber = formatInvoiceNumber(invoicePrefix || 'INV', 7);
  const sampleSubtotal = 25000;
  const sampleTaxAmount = (sampleSubtotal * (defaultTaxPercentage || 0)) / 100;
  const sampleTotal = sampleSubtotal + sampleTaxAmount;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          <span>Live Invoice Preview</span>
        </h3>
        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
          Real-time
        </span>
      </div>

      <Card className="border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-5 space-y-5 text-xs">
          {/* Header Branding */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-2.5 min-w-0">
              {logoUrl ? (
                <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white p-1 shrink-0 overflow-hidden">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-2xs">
                  <Receipt className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">
                  {businessName || 'Your Business Name'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {businessEmail || 'billing@company.com'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="font-mono font-bold text-slate-900 text-xs block">
                {sampleInvoiceNumber}
              </span>
              <Badge variant="sent" size="sm" className="mt-1">
                SENT
              </Badge>
            </div>
          </div>

          {/* Client Info Sample */}
          <div className="space-y-1 bg-slate-50/70 p-3 rounded-lg border border-slate-100 text-[11px]">
            <span className="text-slate-400 font-bold uppercase text-[9px]">Billed To:</span>
            <p className="font-semibold text-slate-800">Acme Technologies</p>
            <p className="text-slate-500">sarah.j@acmetech.io</p>
          </div>

          {/* Sample Line Item */}
          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            <div className="flex justify-between font-medium text-slate-900">
              <span>Website Architecture & UI Tokens</span>
              <span className="tabular-nums">{formatCurrency(sampleSubtotal, currency)}</span>
            </div>
            <p className="text-[11px] text-slate-400">Qty: 1 &bull; Rate: {formatCurrency(sampleSubtotal, currency)}</p>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-[11px]">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800 tabular-nums">
                {formatCurrency(sampleSubtotal, currency)}
              </span>
            </div>

            {defaultTaxPercentage > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Tax ({defaultTaxPercentage}%):</span>
                <span className="font-semibold text-slate-800 tabular-nums">
                  + {formatCurrency(sampleTaxAmount, currency)}
                </span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-xs text-slate-900">
              <span>Total Due:</span>
              <span className="text-indigo-700 font-bold text-sm tabular-nums">
                {formatCurrency(sampleTotal, currency)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
