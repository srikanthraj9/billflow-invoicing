/**
 * Type definitions for BillFlow Pay — Simulated payments, UPI, and bank accounts.
 * Note: These are frontend-only demo types. They do not map to backend/database tables.
 */

export type PaymentMethod = 'UPI' | 'Card' | 'Net Banking' | 'Recorded Paid' | 'Direct';

export type PaymentStatus = 'Paid' | 'Pending' | 'Failed';

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail?: string;
  invoiceNumber: string;
  invoiceId?: string;
  token?: string;
  paymentMethod?: string;
  status: PaymentStatus;
  date: string;
  paidAt?: string;
  dueDate?: string;
  referenceId: string;
  isSimulated?: boolean;
  notes?: string;
}

export interface BankAccount {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumberMasked: string;
  accountNumberRaw?: string;
  ifscCode: string;
  accountType: 'Current' | 'Savings';
  isPrimary: boolean;
  createdAt: string;
}

export interface PaymentLink {
  id: string;
  linkToken: string;
  displayUrl: string;
  invoiceNumber: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  status: 'Active' | 'Disabled';
  createdAt: string;
}

export interface UpiSettings {
  upiId: string;
  businessDisplayName: string;
  acceptUpi: boolean;
}

export interface PaymentDashboardStats {
  totalInvoiced: number;
  totalReceived: number;
  pending: number;
  overdue: number;
  currency: string;
}
