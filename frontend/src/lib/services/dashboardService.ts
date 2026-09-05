/**
 * Dashboard Service for BillFlow.
 * Communicates with the FastAPI backend (/api/dashboard/stats) via the centralized apiClient.
 * The backend is the authoritative source for all financial aggregations, KPIs,
 * recent invoices, dynamic overdue calculations, and monthly income history.
 */

import { apiClient } from '../api-client';
import { getAuthToken } from '../auth-token';
import { CurrencyCode, DashboardStats, Invoice, InvoiceStatus, MonthlyIncomePoint } from '../types';

interface BackendRecentInvoice {
  id: string;
  invoice_number?: string;
  invoiceNumber?: string;
  client_name?: string;
  clientName?: string;
  client_company?: string | null;
  clientCompany?: string | null;
  issue_date?: string;
  issueDate?: string;
  due_date?: string;
  dueDate?: string;
  total?: number | string;
  totalAmount?: number | string;
  status: string;
  currency: string;
}

interface BackendMonthlyIncomePoint {
  month: string;
  year: number;
  period?: string;
  amount: number | string;
  formatted_amount?: string;
  formattedAmount?: string;
}

interface BackendDashboardResponse {
  total_earned?: number | string;
  totalEarned?: number | string;
  total_outstanding?: number | string;
  totalOutstanding?: number | string;
  total_overdue?: number | string;
  totalOverdue?: number | string;
  total_invoices_count?: number;
  totalInvoicesCount?: number;
  overdue_invoices_count?: number;
  overdueInvoicesCount?: number;
  pending_invoices_count?: number;
  pendingInvoicesCount?: number;
  currency: string;
  recent_invoices?: BackendRecentInvoice[];
  recentInvoices?: BackendRecentInvoice[];
  monthly_income?: BackendMonthlyIncomePoint[];
  monthlyIncome?: BackendMonthlyIncomePoint[];
}

function normalizeDashboardResponse(b: BackendDashboardResponse): DashboardStats {
  const currency = (b.currency || 'INR') as CurrencyCode;

  const totalEarned = Number(b.total_earned ?? b.totalEarned ?? 0);
  const totalOutstanding = Number(b.total_outstanding ?? b.totalOutstanding ?? 0);
  const totalOverdue = Number(b.total_overdue ?? b.totalOverdue ?? 0);
  const totalInvoicesCount = Number(b.total_invoices_count ?? b.totalInvoicesCount ?? 0);
  const overdueInvoicesCount = Number(b.overdue_invoices_count ?? b.overdueInvoicesCount ?? 0);
  const pendingInvoicesCount = Number(b.pending_invoices_count ?? b.pendingInvoicesCount ?? 0);

  const rawRecent = b.recent_invoices || b.recentInvoices || [];
  const recentInvoices: Invoice[] = rawRecent.map((inv) => {
    const totalAmount = Number(inv.total ?? inv.totalAmount ?? 0);
    const invoiceNumber = inv.invoice_number || inv.invoiceNumber || 'INV';
    const clientName = inv.client_name || inv.clientName || 'Customer';
    const clientCompany = inv.client_company || inv.clientCompany || undefined;
    const issueDate = String(inv.issue_date || inv.issueDate || '');
    const dueDate = String(inv.due_date || inv.dueDate || '');
    const status = (inv.status || 'draft') as InvoiceStatus;
    const invCurrency = (inv.currency || currency) as CurrencyCode;

    return {
      id: String(inv.id),
      invoiceNumber,
      token: '',
      clientId: '',
      clientName,
      clientEmail: '',
      clientCompany,
      issueDate,
      dueDate,
      items: [],
      subtotal: totalAmount,
      discountPercentage: 0,
      discountAmount: 0,
      taxPercentage: 0,
      taxAmount: 0,
      totalAmount,
      currency: invCurrency,
      status,
      createdAt: issueDate,
      updatedAt: issueDate,
    };
  });

  const rawMonthly = b.monthly_income || b.monthlyIncome || [];
  const monthlyIncome: MonthlyIncomePoint[] = rawMonthly.map((pt) => ({
    month: pt.month,
    year: pt.year,
    amount: Number(pt.amount || 0),
    formattedAmount: pt.formatted_amount || pt.formattedAmount || `${currency} ${Number(pt.amount || 0).toFixed(2)}`,
  }));

  return {
    totalEarned,
    totalOutstanding,
    totalOverdue,
    totalInvoicesCount,
    overdueInvoicesCount,
    pendingInvoicesCount,
    recentInvoices,
    monthlyIncome,
    currency,
  };
}

const inFlightStats = new Map<string, Promise<DashboardStats>>();

export const dashboardService = {
  /**
   * Fetches aggregated dashboard statistics from GET /api/dashboard/stats.
   * Derives all KPIs, timeline data, and recent invoices from the backend.
   * Uses in-flight deduplication to eliminate duplicate requests during navigation.
   */
  async getDashboardStats(months: number = 6): Promise<DashboardStats> {
    const clampedMonths = Math.min(Math.max(months, 1), 24);
    const currentToken = getAuthToken();
    const key = `${currentToken || 'anon'}:${clampedMonths}`;

    const existing = inFlightStats.get(key);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      try {
        const response = await apiClient.get<BackendDashboardResponse>('/dashboard/stats', {
          params: {
            months: clampedMonths,
          },
        });
        return normalizeDashboardResponse(response);
      } finally {
        inFlightStats.delete(key);
      }
    })();

    inFlightStats.set(key, promise);
    return promise;
  },
};
