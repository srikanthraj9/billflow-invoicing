'use client';

import * as React from 'react';
import { Hash, DollarSign, Percent, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { LogoUploader } from './LogoUploader';
import { CurrencyCode } from '@/lib/types';

export interface InvoicePreferencesFormProps {
  logoUrl?: string;
  currency: CurrencyCode;
  invoicePrefix: string;
  defaultTaxPercentage?: number;
  defaultPaymentTermsDays?: number;
  onLogoChange: (url: string) => void;
  onCurrencyChange: (curr: CurrencyCode) => void;
  onPrefixChange: (prefix: string) => void;
  onTaxChange: (tax: number) => void;
  onTermsChange: (days: number) => void;
  errors?: {
    invoicePrefix?: string;
  };
  disabled?: boolean;
}

export function InvoicePreferencesForm({
  logoUrl,
  currency,
  invoicePrefix,
  defaultTaxPercentage = 18,
  defaultPaymentTermsDays = 14,
  onLogoChange,
  onCurrencyChange,
  onPrefixChange,
  onTaxChange,
  onTermsChange,
  errors = {},
  disabled = false,
}: InvoicePreferencesFormProps) {
  const currencyOptions = [
    { value: 'INR', label: 'INR (₹) — Indian Rupee' },
    { value: 'USD', label: 'USD ($) — US Dollar' },
    { value: 'EUR', label: 'EUR (€) — Euro' },
    { value: 'GBP', label: 'GBP (£) — British Pound' },
  ];

  return (
    <Card className="border border-slate-200/90 bg-white shadow-xs">
      <CardHeader className="pb-4 border-b border-slate-100">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Branding & Invoice Preferences
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Configure visual branding and default parameters for newly created invoices.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {/* Logo Uploader */}
        <LogoUploader logoUrl={logoUrl} onChange={onLogoChange} disabled={disabled} />

        {/* Currency & Prefix Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Workspace Currency
            </label>
            <Select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              options={currencyOptions}
              disabled={disabled}
            />
            <p className="text-[11px] text-slate-400">
              Primary currency used for revenue totals and newly created invoices.
            </p>
          </div>

          <Input
            label="Invoice Number Prefix"
            value={invoicePrefix}
            onChange={(e) => {
              // Sanitize prefix to alphanumeric + hyphens
              const sanitized = e.target.value.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase();
              onPrefixChange(sanitized);
            }}
            placeholder="INV"
            leftIcon={<Hash className="h-4 w-4 text-slate-400" />}
            error={errors.invoicePrefix}
            disabled={disabled}
            required
            helperText="Used when generating new invoice numbers (e.g. INV-0001)."
          />
        </div>

        {/* Default Tax & Payment Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <Input
            label="Default Tax / GST Rate (%)"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={defaultTaxPercentage}
            onChange={(e) => onTaxChange(parseFloat(e.target.value) || 0)}
            placeholder="18"
            rightIcon={<Percent className="h-4 w-4 text-slate-400" />}
            disabled={disabled}
            helperText="Pre-filled on new invoice line items."
          />

          <Input
            label="Default Payment Terms (Days)"
            type="number"
            min="1"
            max="180"
            step="1"
            value={defaultPaymentTermsDays}
            onChange={(e) => onTermsChange(parseInt(e.target.value, 10) || 14)}
            placeholder="14"
            rightIcon={<Calendar className="h-4 w-4 text-slate-400" />}
            disabled={disabled}
            helperText="Calculates invoice due date from issue date."
          />
        </div>
      </CardContent>
    </Card>
  );
}
