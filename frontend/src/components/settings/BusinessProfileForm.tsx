'use client';

import * as React from 'react';
import { Building, Mail, Phone, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

export interface BusinessProfileFormProps {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  onChange: (field: string, value: string) => void;
  errors?: {
    businessName?: string;
    businessEmail?: string;
  };
  disabled?: boolean;
}

export function BusinessProfileForm({
  businessName,
  businessEmail,
  businessPhone,
  businessAddress,
  onChange,
  errors = {},
  disabled = false,
}: BusinessProfileFormProps) {
  return (
    <Card className="border border-slate-200/90 bg-white shadow-xs">
      <CardHeader className="pb-4 border-b border-slate-100">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Business Information
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Your company information will appear on all client invoices and receipts.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Business Name */}
        <Input
          label="Business / Studio Name"
          value={businessName}
          onChange={(e) => onChange('businessName', e.target.value)}
          placeholder="e.g. Alex Morgan Design Studio"
          leftIcon={<Building className="h-4 w-4 text-slate-400" />}
          error={errors.businessName}
          disabled={disabled}
          required
        />

        {/* Business Email & Phone Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Business Email"
            type="email"
            value={businessEmail}
            onChange={(e) => onChange('businessEmail', e.target.value)}
            placeholder="billing@alexmorganstudio.com"
            leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
            error={errors.businessEmail}
            disabled={disabled}
            required
            helperText="Address displayed on invoices for client replies."
          />

          <Input
            label="Business Phone"
            type="tel"
            value={businessPhone}
            onChange={(e) => onChange('businessPhone', e.target.value)}
            placeholder="+91 98765 43210"
            leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
            disabled={disabled}
            helperText="Optional contact telephone."
          />
        </div>

        {/* Business Address */}
        <Textarea
          label="Registered Business Address"
          value={businessAddress}
          onChange={(e) => onChange('businessAddress', e.target.value)}
          placeholder="Street address, Suite / Floor, City, State, Postal Code, Country"
          rows={3}
          disabled={disabled}
          helperText="Official address displayed at the top of client invoices."
        />
      </CardContent>
    </Card>
  );
}
