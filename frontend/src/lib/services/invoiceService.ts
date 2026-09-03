/**
 * Invoice Service for BillFlow.
 * Communicates with the FastAPI backend (/api/invoices) via the centralized apiClient.
 * Ensures the backend remains the authoritative source for all financial calculations,
 * sequential numbering, status transitions, and dynamic overdue states.
 */

import { apiClient, ApiError } from '../api-client';
import { CurrencyCode, Invoice, InvoiceFilters, InvoiceItem, InvoiceStatus } from '../types';

interface BackendClientSummary {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface BackendInvoiceItemResponse {
  id: string;
  description: string;
  quantity: number | string;
  rate: number | string;
  amount: number | string;
  created_at: string;
  updated_at: string;
}

interface BackendInvoiceResponse {
  id: string;
  invoice_number: string;
  client_id: string;
  client?: BackendClientSummary | null;
  status: string;
  issue_date: string;
  due_date: string;
  notes?: string | null;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  paid_at?: string | null;
  public_token?: string | null;
  items: BackendInvoiceItemResponse[];
  created_at: string;
  updated_at: string;
}

interface BackendInvoiceListResponse {
  items: BackendInvoiceResponse[];
  total: number;
  limit: number;
  offset: number;
}

interface BackendSettingsResponse {
  invoicePrefix?: string;
  currency?: CurrencyCode;
}

let cachedTotalCount = 0;

function normalizeInvoice(b: BackendInvoiceResponse, currency: CurrencyCode = 'INR'): Invoice {
  const items: InvoiceItem[] = (b.items || []).map((item) => ({
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity),
    rate: Number(item.rate),
    amount: Number(item.amount),
  }));

  const subtotal = Number(b.subtotal);
  const discountAmount = Number(b.discount);
  const taxAmount = Number(b.tax);
  const totalAmount = Number(b.total);

  // Compute discount and tax percentages for UX display if applicable
  const discountPercentage = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  const taxableBase = subtotal - discountAmount;
  const taxPercentage = taxableBase > 0 ? (taxAmount / taxableBase) * 100 : 0;

  return {
    id: b.id,
    invoiceNumber: b.invoice_number,
    token: b.public_token || '',
    clientId: b.client_id,
    clientName: b.client?.name || 'Unknown Client',
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
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

export type CreateInvoiceInput = Omit<
  Invoice,
  'id' | 'token' | 'createdAt' | 'updatedAt' | 'invoiceNumber' | 'dueDate' | 'taxPercentage'
> & {
  invoiceNumber?: string;
  dueDate?: string;
  taxPercentage?: number;
};

export const invoiceService = {
  /**
   * Fetches all invoices with server-side search, status filter, client filter, and sorting.
   */
  async getInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
    const params: Record<string, string | number | boolean | undefined | null> = {
      limit: 100,
      offset: 0,
    };

    if (filters?.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }

    if (filters?.status && filters.status !== 'all') {
      params.status = filters.status;
    }

    if (filters?.clientId) {
      params.client_id = filters.clientId;
    }

    if (filters?.sortBy) {
      params.sort_by = filters.sortBy;
    } else {
      params.sort_by = 'newest';
    }

    const response = await apiClient.get<BackendInvoiceListResponse>('/invoices', {
      params,
    });

    cachedTotalCount = response.total;
    return response.items.map((i) => normalizeInvoice(i));
  },

  /**
   * Returns total count of all stored invoices for the current user.
   */
  async getTotalCount(): Promise<number> {
    if (cachedTotalCount > 0) {
      return cachedTotalCount;
    }
    try {
      const response = await apiClient.get<BackendInvoiceListResponse>('/invoices', {
        params: { limit: 1 },
      });
      cachedTotalCount = response.total;
      return cachedTotalCount;
    } catch {
      return 0;
    }
  },

  /**
   * Generates the next sequential invoice number using current business prefix.
   */
  async getNextInvoiceNumber(customPrefix?: string): Promise<string> {
    let prefix = customPrefix;
    if (!prefix) {
      try {
        const settings = await apiClient.get<BackendSettingsResponse>('/settings');
        prefix = settings.invoicePrefix || 'INV';
      } catch {
        prefix = 'INV';
      }
    }

    try {
      const response = await apiClient.get<BackendInvoiceListResponse>('/invoices', {
        params: { limit: 100 },
      });
      let maxSeq = 0;
      for (const inv of response.items) {
        if (inv.invoice_number.startsWith(`${prefix}-`)) {
          const parts = inv.invoice_number.split('-');
          const lastPart = parts[parts.length - 1];
          const seq = parseInt(lastPart, 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
      const nextSeq = maxSeq + 1;
      return `${prefix}-${String(nextSeq).padStart(4, '0')}`;
    } catch {
      return `${prefix}-0001`;
    }
  },

  /**
   * Fetches single invoice by ID from GET /api/invoices/{id}.
   * Returns null if not found (404) or cross-tenant.
   */
  async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const response = await apiClient.get<BackendInvoiceResponse>(`/invoices/${id}`);
      return normalizeInvoice(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Fetches single invoice by public token (no-auth client portal).
   * Kept for public portal compatibility until Stage 8D.
   */
  async getInvoiceByToken(token: string): Promise<Invoice | null> {
    try {
      const response = await apiClient.get<BackendInvoiceResponse>(`/public/invoices/${token}`, {
        skipAuth: true,
      });
      return normalizeInvoice(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Creates a new invoice via POST /api/invoices.
   * Transmits only valid backend fields; backend strictly recalculates all totals.
   */
  async createInvoice(data: CreateInvoiceInput): Promise<Invoice> {
    const payload: Record<string, unknown> = {
      client_id: data.clientId,
      issue_date: data.issueDate,
      items: data.items.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        rate: item.rate,
      })),
    };

    if (data.invoiceNumber && data.invoiceNumber.trim()) {
      payload.invoice_number = data.invoiceNumber.trim();
    }

    if (data.status) {
      payload.status = data.status;
    }

    if (data.dueDate) {
      payload.due_date = data.dueDate;
    }

    if (data.notes && data.notes.trim()) {
      payload.notes = data.notes.trim();
    }

    if (data.discountAmount !== undefined && data.discountAmount > 0) {
      payload.discount = data.discountAmount;
    } else if (data.discountPercentage !== undefined && data.discountPercentage > 0) {
      payload.discount_percentage = data.discountPercentage;
    }

    // Explicit 0% tax rate must be preserved
    if (data.taxPercentage !== undefined && data.taxPercentage !== null) {
      payload.tax_percentage = data.taxPercentage;
    }

    const response = await apiClient.post<BackendInvoiceResponse>('/invoices', payload);
    cachedTotalCount++;
    return normalizeInvoice(response, data.currency);
  },

  /**
   * Updates an invoice via PUT /api/invoices/{id}.
   */
  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const payload: Record<string, unknown> = {};

    if (data.clientId) {
      payload.client_id = data.clientId;
    }
    if (data.status) {
      payload.status = data.status;
    }
    if (data.issueDate) {
      payload.issue_date = data.issueDate;
    }
    if (data.dueDate) {
      payload.due_date = data.dueDate;
    }
    if (data.notes !== undefined) {
      payload.notes = data.notes?.trim() || null;
    }
    if (data.discountAmount !== undefined) {
      payload.discount = data.discountAmount;
    }
    if (data.taxPercentage !== undefined && data.taxPercentage !== null) {
      payload.tax_percentage = data.taxPercentage;
    }
    if (data.items) {
      payload.items = data.items.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        rate: item.rate,
      }));
    }

    const response = await apiClient.put<BackendInvoiceResponse>(`/invoices/${id}`, payload);
    return normalizeInvoice(response);
  },

  /**
   * Simulates payment for public invoice.
   * Kept for client portal until Stage 8D.
   */
  async payInvoice(tokenOrId: string): Promise<Invoice> {
    const response = await apiClient.post<BackendInvoiceResponse>(
      `/public/invoices/${tokenOrId}/pay`,
      {},
      { skipAuth: true }
    );
    return normalizeInvoice(response);
  },

  /**
   * Deletes a draft invoice via DELETE /api/invoices/{id}.
   */
  async deleteInvoice(id: string): Promise<boolean> {
    await apiClient.delete<void>(`/invoices/${id}`);
    if (cachedTotalCount > 0) cachedTotalCount--;
    return true;
  },
};
