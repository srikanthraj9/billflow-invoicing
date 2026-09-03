'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Building, Phone, MapPin, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Client } from '@/lib/types';

export interface ClientFormProps {
  initialData?: Partial<Client>;
  onSubmit: (data: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    address?: string;
  }) => Promise<void>;
  isEditing?: boolean;
}

export function ClientForm({ initialData, onSubmit, isEditing = false }: ClientFormProps) {
  const router = useRouter();

  const [name, setName] = React.useState(initialData?.name || '');
  const [email, setEmail] = React.useState(initialData?.email || '');
  const [company, setCompany] = React.useState(initialData?.company || '');
  const [phone, setPhone] = React.useState(initialData?.phone || '');
  const [address, setAddress] = React.useState(initialData?.address || '');

  const [errors, setErrors] = React.useState<{
    name?: string;
    email?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const validate = () => {
    const errs: { name?: string; email?: string } = {};

    if (!name.trim()) {
      errs.name = 'Client name is required.';
    } else if (name.trim().length < 2) {
      errs.name = 'Client name must be at least 2 characters.';
    }

    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving.';
      setErrors({ general: msg });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Client Directory</span>
      </Link>

      <Card className="border border-slate-200/90 shadow-sm bg-white">
        <CardHeader className="pb-6 border-b border-slate-100">
          <CardTitle className="text-xl font-bold text-slate-900">
            {isEditing ? 'Edit Client Details' : 'Add New Client'}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-slate-500">
            {isEditing
              ? 'Update the billing details and contact information for this client.'
              : 'Save client information once to easily generate and dispatch invoices later.'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-5 pt-6">
            {/* General Error Banner */}
            {errors.general && (
              <div
                className="rounded-lg bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errors.general}</span>
              </div>
            )}

            {/* Client Full Name */}
            <Input
              label="Client Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g. Sarah Jenkins"
              leftIcon={<User className="h-4 w-4" />}
              error={errors.name}
              disabled={isSubmitting}
              required
              helperText="The primary contact or business owner name."
            />

            {/* Email Address */}
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="sarah.j@acmetech.io"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email}
              disabled={isSubmitting}
              required
              helperText="Invoices and payment receipts will be addressed to this email."
            />

            {/* Company & Phone Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company Name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Technologies"
                leftIcon={<Building className="h-4 w-4" />}
                disabled={isSubmitting}
                helperText="Optional business or studio name."
              />

              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                leftIcon={<Phone className="h-4 w-4" />}
                disabled={isSubmitting}
                helperText="Optional contact phone."
              />
            </div>

            {/* Billing Address */}
            <Textarea
              label="Billing Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address, Suite / Floor, City, State, PIN Code"
              rows={3}
              disabled={isSubmitting}
              helperText="This address will appear under the 'Billed To' section on client invoices."
            />
          </CardContent>

          <CardFooter className="flex items-center justify-end gap-3 pt-6 pb-6 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
            <Link href="/clients">
              <Button variant="outline" size="md" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              leftIcon={!isSubmitting && <Check className="h-4 w-4" />}
            >
              {isEditing ? 'Save Changes' : 'Create Client'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
