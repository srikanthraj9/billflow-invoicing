/**
 * Public Invoice Service for BillFlow.
 * Handles customer-facing unauthenticated invoice retrieval and simulated payments
 * via FastAPI endpoints (/api/public/invoices/{token} and /api/public/invoices/{token}/pay).
 *
 * Security:
 * - Does NOT require or transmit business user authentication (JWT).
 * - Never includes the Authorization header.
 * - Does not expose internal database IDs or credentials.
 * - Does not leak draft invoice existence.
 */

import { apiClient, ApiError } from '../api-client';
import { CurrencyCode, Invoice, InvoiceItem, InvoiceStatus, BusinessSettings } from '../types';

export interface BackendPublicItem {
  description: string;
  quantity: number | string;
  rate: number | string;
  amount: number | string;
}

export interface BackendPublicClient {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface BackendPublicBusiness {
  business_name: string;
  business_email: string;
  business_phone?: string | null;
  business_address?: string | null;
  logo_url?: string | null;
  currency: string;
}

export interface BackendPublicInvoiceResponse {
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string;
  notes?: string | null;
  currency: string;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  paid_at?: string | null;
  items: BackendPublicItem[];
  client: BackendPublicClient;
  business: BackendPublicBusiness;
}

export interface PublicInvoiceData {
  invoice: Invoice;
  business: Partial<BusinessSettings>;
}

function normalizePublicData(b: BackendPublicInvoiceResponse, token: string): PublicInvoiceData {
  const currency = (b.currency || 'INR') as CurrencyCode;
  const subtotal = Number(b.subtotal);
  const discountAmount = Number(b.discount);
  const taxAmount = Number(b.tax);
  const totalAmount = Number(b.total);

  const discountPercentage = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  const taxableBase = subtotal - discountAmount;
  const taxPercentage = taxableBase > 0 ? (taxAmount / taxableBase) * 100 : 0;

  const items: InvoiceItem[] = (b.items || []).map((item, index) => ({
    id: `item_${index + 1}`,
    description: item.description,
    quantity: Number(item.quantity),
    rate: Number(item.rate),
    amount: Number(item.amount),
  }));

  const invoice: Invoice = {
    id: '', // Internal database ID is intentionally omitted from public portal
    invoiceNumber: b.invoice_number,
    token: token,
    clientId: '', // Client internal ID is intentionally omitted from public portal
    clientName: b.client?.name || 'Customer',
    clientEmail: b.client?.email || '',
    clientCompany: b.client?.company || undefined,
    clientAddress: b.client?.address || undefined,
    issueDate: b.issue_date,
    dueDate: b.due_date,
    items,
    subtotal,
    discountPercentage: Math.round(discountPercentage * 100) / 100,
    discountAmount,
    taxPercentage: Math.round(taxPercentage * 100) / 100,
    taxAmount,
    totalAmount,
    currency,
    notes: b.notes || undefined,
    status: b.status as InvoiceStatus,
    paidAt: b.paid_at || undefined,
    createdAt: b.issue_date,
    updatedAt: b.paid_at || b.issue_date,
  };

  const business: Partial<BusinessSettings> = {
    businessName: b.business?.business_name || 'BillFlow Merchant',
    businessEmail: b.business?.business_email || '',
    businessPhone: b.business?.business_phone || undefined,
    businessAddress: b.business?.business_address || undefined,
    logoUrl: b.business?.logo_url || undefined,
    currency,
  };

  return { invoice, business };
}

export const publicInvoiceService = {
  /**
   * Fetches public invoice details by secure token from GET /api/public/invoices/{token}.
   * Bypasses JWT authentication header completely.
   * Returns null on 404 (draft, non-existent, or invalid token).
   */
  async getPublicInvoice(token: string): Promise<PublicInvoiceData | null> {
    if (!token || !token.trim()) {
      return null;
    }

    try {
      const response = await apiClient.get<BackendPublicInvoiceResponse>(
        `/public/invoices/${encodeURIComponent(token.trim())}`,
        { skipAuth: true }
      );
      return normalizePublicData(response, token.trim());
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Simulates payment for public invoice via POST /api/public/invoices/{token}/pay.
   * Bypasses JWT authentication header.
   * Sends NO payment credentials or request body.
   * Returns updated authoritative invoice.
   */
  async payPublicInvoice(token: string): Promise<Invoice> {
    if (!token || !token.trim()) {
      throw new Error('Public token is required to process payment.');
    }

    const response = await apiClient.post<BackendPublicInvoiceResponse>(
      `/public/invoices/${encodeURIComponent(token.trim())}/pay`,
      undefined,
      { skipAuth: true }
    );

    return normalizePublicData(response, token.trim()).invoice;
  },
};
