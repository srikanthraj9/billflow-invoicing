'use client';

import * as React from 'react';
import { Check, RotateCcw, AlertCircle, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ErrorState } from '@/components/ui/ErrorState';
import { BusinessProfileForm } from './BusinessProfileForm';
import { InvoicePreferencesForm } from './InvoicePreferencesForm';
import { SettingsPreview } from './SettingsPreview';
import { SettingsSkeleton } from './SettingsSkeleton';
import { BusinessSettings, CurrencyCode } from '@/lib/types';
import { settingsService } from '@/lib/services/settingsService';

export function SettingsContainer() {
  const toast = useToast();

  const [savedSettings, setSavedSettings] = React.useState<BusinessSettings | null>(null);
  const [formData, setFormData] = React.useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<{
    businessName?: string;
    businessEmail?: string;
    invoicePrefix?: string;
    general?: string;
  }>({});

  const loadSettings = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await settingsService.getSettings();
      setSavedSettings(data);
      setFormData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load your settings.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  if (error || !formData) {
    return (
      <ErrorState
        title="Unable to load settings"
        message={error || 'An unexpected error occurred.'}
        onRetry={loadSettings}
      />
    );
  }

  // Check dirty state
  const isDirty = Boolean(
    savedSettings && JSON.stringify(formData) !== JSON.stringify(savedSettings)
  );

  const validate = () => {
    const errs: {
      businessName?: string;
      businessEmail?: string;
      invoicePrefix?: string;
    } = {};

    if (!formData.businessName?.trim()) {
      errs.businessName = 'Business name is required.';
    } else if (formData.businessName.trim().length < 2) {
      errs.businessName = 'Business name must be at least 2 characters.';
    }

    if (!formData.businessEmail?.trim()) {
      errs.businessEmail = 'Business email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessEmail.trim())) {
      errs.businessEmail = 'Please enter a valid email address.';
    }

    if (!formData.invoicePrefix?.trim()) {
      errs.invoicePrefix = 'Invoice prefix is required.';
    } else if (formData.invoicePrefix.trim().length > 10) {
      errs.invoicePrefix = 'Prefix must be 10 characters or less.';
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    setValidationErrors({});

    if (!validate()) {
      toast.error('Validation Error', 'Please correct the highlighted fields before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await settingsService.updateSettings(formData);
      setSavedSettings(updated);
      setFormData(updated);
      toast.success('Settings Saved', 'Business profile and invoice preferences updated.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to save settings.';
      setValidationErrors({ general: msg });
      toast.error('Save Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (savedSettings) {
      setFormData(savedSettings);
      setValidationErrors({});
      toast.info('Changes Reverted', 'Form restored to saved values.');
    }
  };

  const handleLogoChange = (url: string) => {
    const cleanUrl = url || undefined;
    setFormData((prev) => (prev ? { ...prev, logoUrl: cleanUrl } : prev));
    setSavedSettings((prev) => (prev ? { ...prev, logoUrl: cleanUrl } : prev));
  };

  const updateField = (field: keyof BusinessSettings, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header with Dirty Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Settings
            </h1>
            {isDirty && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Manage your business identity, branding, currency, and invoice numbering.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isDirty && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Cancel
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!isDirty || isSaving}
            leftIcon={!isSaving && <Check className="h-4 w-4" />}
            className="shadow-xs"
          >
            Save changes
          </Button>
        </div>
      </div>

      {/* General Error Banner */}
      {validationErrors.general && (
        <div
          className="rounded-xl bg-rose-50 p-4 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5 animate-in fade-in"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-semibold">{validationErrors.general}</span>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Business Profile & Preferences */}
        <div className="lg:col-span-2 space-y-6">
          <BusinessProfileForm
            businessName={formData.businessName}
            businessEmail={formData.businessEmail}
            businessPhone={formData.businessPhone}
            businessAddress={formData.businessAddress}
            onChange={(f, v) => updateField(f as keyof BusinessSettings, v)}
            errors={{
              businessName: validationErrors.businessName,
              businessEmail: validationErrors.businessEmail,
            }}
            disabled={isSaving}
          />

          <InvoicePreferencesForm
            logoUrl={formData.logoUrl}
            currency={formData.currency}
            invoicePrefix={formData.invoicePrefix}
            defaultTaxPercentage={formData.defaultTaxPercentage}
            defaultPaymentTermsDays={formData.defaultPaymentTermsDays}
            onLogoChange={handleLogoChange}
            onCurrencyChange={(c) => updateField('currency', c)}
            onPrefixChange={(p) => updateField('invoicePrefix', p)}
            onTaxChange={(t) => updateField('defaultTaxPercentage', t)}
            onTermsChange={(d) => updateField('defaultPaymentTermsDays', d)}
            errors={{
              invoicePrefix: validationErrors.invoicePrefix,
            }}
            disabled={isSaving}
          />
        </div>

        {/* Right Column (1/3): Sticky Live Invoice Preview */}
        <div className="space-y-6">
          <div className="sticky top-6 space-y-4">
            <SettingsPreview
              businessName={formData.businessName}
              businessEmail={formData.businessEmail}
              businessPhone={formData.businessPhone}
              businessAddress={formData.businessAddress}
              logoUrl={formData.logoUrl}
              currency={formData.currency}
              invoicePrefix={formData.invoicePrefix}
              defaultTaxPercentage={formData.defaultTaxPercentage}
            />

            {/* Sticky Action Footer */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full justify-center shadow-xs"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={!isDirty || isSaving}
                leftIcon={!isSaving && <Check className="h-4 w-4" />}
              >
                Save changes
              </Button>

              {isDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-slate-500"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel changes
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
