export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  businessName?: string;
  businessEmail?: string;
  businessAddress?: string;
  businessPhone?: string;
  currency?: CurrencyCode;
  invoicePrefix?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
  address?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  totalInvoiced?: number;
  totalPaid?: number;
  totalOutstanding?: number;
  invoiceCount?: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  token: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  clientAddress?: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  currency: CurrencyCode;
  notes?: string;
  status: InvoiceStatus;
  sentAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSettings {
  businessName: string;
  businessEmail: string;
  businessAddress: string;
  businessPhone: string;
  logoUrl?: string;
  currency: CurrencyCode;
  invoicePrefix: string;
  defaultTaxPercentage?: number;
  defaultPaymentTermsDays?: number;
}

export interface MonthlyIncomePoint {
  month: string;
  year: number;
  amount: number;
  formattedAmount: string;
}

export interface DashboardStats {
  totalEarned: number;
  totalOutstanding: number;
  totalOverdue: number;
  totalInvoicesCount: number;
  overdueInvoicesCount?: number;
  pendingInvoicesCount?: number;
  recentInvoices: Invoice[];
  monthlyIncome: MonthlyIncomePoint[];
  currency: CurrencyCode;
}

export interface InvoiceFilters {
  status?: InvoiceStatus | 'all';
  clientId?: string;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'highest_amount' | 'lowest_amount' | 'due_date';
}

export interface ClientFilters {
  search?: string;
  sortBy?: 'name' | 'recent' | 'highest_invoiced';
}
