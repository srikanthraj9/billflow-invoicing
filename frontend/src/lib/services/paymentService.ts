import { apiClient } from '../api-client';

export interface BackendPaymentDetail {
  id: string;
  invoice_id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string | null;
  amount: number | string;
  currency: string;
  method: string;
  status: string;
  reference: string;
  paid_at?: string | null;
  created_at: string;
}

export interface AuthoritativePayment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference: string;
  paidAt?: string;
  createdAt: string;
}

function normalizePayment(p: BackendPaymentDetail): AuthoritativePayment {
  return {
    id: p.id,
    invoiceId: p.invoice_id,
    invoiceNumber: p.invoice_number,
    clientName: p.client_name,
    clientEmail: p.client_email || undefined,
    amount: Number(p.amount),
    currency: p.currency || 'INR',
    method: p.method,
    status: p.status,
    reference: p.reference,
    paidAt: p.paid_at || undefined,
    createdAt: p.created_at,
  };
}

let inFlightPaymentsPromise: Promise<AuthoritativePayment[]> | null = null;

export const paymentService = {
  /**
   * Retrieves all authoritative backend payment records for authenticated user.
   * Employs in-flight deduplication to guarantee 0 duplicate network calls.
   */
  async getPayments(): Promise<AuthoritativePayment[]> {
    if (inFlightPaymentsPromise) {
      return inFlightPaymentsPromise;
    }

    inFlightPaymentsPromise = (async () => {
      try {
        const response = await apiClient.get<BackendPaymentDetail[]>('/payments');
        return (response || []).map(normalizePayment);
      } catch {
        return [];
      } finally {
        setTimeout(() => {
          inFlightPaymentsPromise = null;
        }, 400);
      }
    })();

    return inFlightPaymentsPromise;
  },

  /**
   * Retrieves payment details for a specific invoice.
   */
  async getPaymentForInvoice(invoiceId: string): Promise<AuthoritativePayment | null> {
    if (!invoiceId) return null;
    try {
      const response = await apiClient.get<BackendPaymentDetail>(
        `/payments/invoice/${encodeURIComponent(invoiceId)}`
      );
      return response ? normalizePayment(response) : null;
    } catch {
      return null;
    }
  },
};
