/**
 * Settings Service for BillFlow.
 * Integrates with FastAPI backend (/api/settings) for business profile identity,
 * default invoice preferences (currency, prefix, tax, payment terms),
 * and object-storage logo upload and deletion.
 */

import { apiClient } from '../api-client';
import { BusinessSettings, CurrencyCode } from '../types';

interface BackendSettingsResponse {
  business_name?: string;
  businessName?: string;
  business_email?: string;
  businessEmail?: string;
  business_phone?: string | null;
  businessPhone?: string | null;
  business_address?: string | null;
  businessAddress?: string | null;
  logo_url?: string | null;
  logoUrl?: string | null;
  currency?: string;
  invoice_prefix?: string;
  invoicePrefix?: string;
  default_tax_rate?: number | string;
  defaultTaxPercentage?: number | string;
  default_payment_terms?: number;
  defaultPaymentTermsDays?: number;
}

interface BackendLogoResponse {
  logo_url?: string;
  logoUrl?: string;
}

function normalizeSettings(res: BackendSettingsResponse): BusinessSettings {
  const taxVal = res.default_tax_rate !== undefined
    ? Number(res.default_tax_rate)
    : res.defaultTaxPercentage !== undefined
    ? Number(res.defaultTaxPercentage)
    : 18;

  const termsVal = res.default_payment_terms !== undefined
    ? Number(res.default_payment_terms)
    : res.defaultPaymentTermsDays !== undefined
    ? Number(res.defaultPaymentTermsDays)
    : 14;

  return {
    businessName: res.business_name ?? res.businessName ?? '',
    businessEmail: res.business_email ?? res.businessEmail ?? '',
    businessPhone: res.business_phone ?? res.businessPhone ?? '',
    businessAddress: res.business_address ?? res.businessAddress ?? '',
    logoUrl: res.logo_url ?? res.logoUrl ?? undefined,
    currency: (res.currency || 'INR') as CurrencyCode,
    invoicePrefix: res.invoice_prefix ?? res.invoicePrefix ?? 'INV',
    defaultTaxPercentage: isNaN(taxVal) ? 18 : taxVal,
    defaultPaymentTermsDays: isNaN(termsVal) ? 14 : termsVal,
  };
}

export const settingsService = {
  /**
   * Retrieves the authenticated merchant's business settings.
   */
  async getSettings(): Promise<BusinessSettings> {
    const response = await apiClient.get<BackendSettingsResponse>('/settings');
    return normalizeSettings(response);
  },

  /**
   * Updates business identity and invoice preferences via PUT /api/settings.
   * If partial fields are supplied, merges with existing settings to satisfy backend required schema.
   * Sends only the 8 supported settings fields without internal database IDs or logo_url.
   */
  async updateSettings(data: Partial<BusinessSettings>): Promise<BusinessSettings> {
    const current = await this.getSettings();

    const payload: Record<string, any> = {
      business_name: (data.businessName ?? current.businessName ?? '').trim(),
      business_email: (data.businessEmail ?? current.businessEmail ?? '').trim().toLowerCase(),
      business_phone: data.businessPhone !== undefined ? (data.businessPhone ? data.businessPhone.trim() : null) : (current.businessPhone ? current.businessPhone.trim() : null),
      business_address: data.businessAddress !== undefined ? (data.businessAddress ? data.businessAddress.trim() : null) : (current.businessAddress ? current.businessAddress.trim() : null),
      currency: data.currency ? data.currency.toUpperCase() : current.currency,
      invoice_prefix: (data.invoicePrefix ?? current.invoicePrefix ?? 'INV').trim().toUpperCase(),
      default_tax_rate: data.defaultTaxPercentage !== undefined ? Number(data.defaultTaxPercentage) : current.defaultTaxPercentage,
      default_payment_terms: data.defaultPaymentTermsDays !== undefined ? Number(data.defaultPaymentTermsDays) : current.defaultPaymentTermsDays,
    };

    const response = await apiClient.put<BackendSettingsResponse>('/settings', payload);
    return normalizeSettings(response);
  },

  /**
   * Uploads a new business logo via POST /api/settings/logo (multipart/form-data).
   * Returns the newly generated public URL from object storage.
   */
  async uploadLogo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<BackendLogoResponse>('/settings/logo', formData);
    return response.logoUrl || response.logo_url || '';
  },

  /**
   * Idempotently deletes the business logo via DELETE /api/settings/logo.
   */
  async deleteLogo(): Promise<void> {
    await apiClient.delete<void>('/settings/logo');
  },
};
