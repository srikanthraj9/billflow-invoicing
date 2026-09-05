/**
 * Mock Payment Service — BillFlow Pay
 *
 * CRITICAL DATA SAFETY & INTEGRATION RULE:
 * 1. This service manages frontend-only simulated demo payments and settlement settings in localStorage.
 * 2. It NEVER creates fake invoices or fake customers.
 * 3. Invoices, clients, amounts, and statuses are derived strictly from the backend API.
 * 4. This service NEVER interacts with or mutates the database.
 */

import {
  PaymentRecord,
  BankAccount,
  PaymentLink,
  UpiSettings,
} from '@/lib/types/payments';

const STORAGE_KEYS = {
  PAYMENTS: 'billflow_demo_payments',
  BANK_ACCOUNTS: 'billflow_demo_bank_accounts',
  UPI_SETTINGS: 'billflow_demo_upi_settings',
  PAYMENT_LINKS: 'billflow_demo_payment_links',
} as const;

// Default demo settlement bank accounts
const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'ba-demo-1',
    accountHolderName: 'BillFlow Technologies',
    bankName: 'HDFC Bank',
    accountNumberMasked: '•••• 1234',
    ifscCode: 'HDFC0001234',
    accountType: 'Current',
    isPrimary: true,
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'ba-demo-2',
    accountHolderName: 'BillFlow Technologies',
    bankName: 'ICICI Bank',
    accountNumberMasked: '•••• 5678',
    ifscCode: 'ICIC0005678',
    accountType: 'Savings',
    isPrimary: false,
    createdAt: '2026-02-10T11:30:00Z',
  },
];

const INITIAL_UPI_SETTINGS: UpiSettings = {
  upiId: 'business@upi',
  businessDisplayName: 'BillFlow Technologies',
  acceptUpi: true,
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getItem<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors in demo mode
  }
}

class MockPaymentService {
  // =========================================================================
  // PAYMENTS (Simulated checkouts referencing real backend invoices)
  // =========================================================================
  getPayments(): PaymentRecord[] {
    const list = getItem<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, []);
    // Automatically filter out any legacy fabricated seed records
    const cleaned = list.filter((p) => !p.invoiceNumber?.startsWith('INV-2026-'));
    if (cleaned.length !== list.length) {
      setItem(STORAGE_KEYS.PAYMENTS, cleaned);
    }
    return cleaned;
  }

  getPaymentByInvoice(identifier: string): PaymentRecord | null {
    if (!identifier || !identifier.trim()) return null;
    const target = identifier.trim().toLowerCase();
    const list = this.getPayments();
    return (
      list.find(
        (p) =>
          (p.invoiceId && p.invoiceId.toLowerCase() === target) ||
          (p.invoiceNumber && p.invoiceNumber.toLowerCase() === target) ||
          (p.token && p.token.toLowerCase() === target) ||
          (p.referenceId && p.referenceId.toLowerCase() === target) ||
          (p.id && p.id.toLowerCase() === target)
      ) || null
    );
  }

  getPaymentById(id: string): PaymentRecord | null {
    return this.getPaymentByInvoice(id);
  }

  getPaymentByInvoiceId(invoiceId: string): PaymentRecord | null {
    return this.getPaymentByInvoice(invoiceId);
  }

  addDemoPayment(
    payment: Omit<PaymentRecord, 'id' | 'referenceId'> & { id?: string; referenceId?: string }
  ): PaymentRecord {
    const list = this.getPayments();
    const refId = payment.referenceId || `BF-DEMO-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();
    const newRecord: PaymentRecord = {
      ...payment,
      id: payment.id || refId,
      referenceId: refId,
      paidAt: payment.paidAt || now,
      date: payment.date || now.split('T')[0],
      isSimulated: true,
      status: 'Paid',
    };
    // Remove any previous record for the same invoice to prevent duplicate entries
    const filtered = list.filter(
      (p) =>
        !(
          (payment.invoiceId && p.invoiceId && p.invoiceId.toLowerCase() === payment.invoiceId.toLowerCase()) ||
          (payment.invoiceNumber && p.invoiceNumber && p.invoiceNumber.toLowerCase() === payment.invoiceNumber.toLowerCase()) ||
          (payment.token && p.token && p.token.toLowerCase() === payment.token.toLowerCase())
        )
    );
    const updated = [newRecord, ...filtered];
    setItem(STORAGE_KEYS.PAYMENTS, updated);
    return newRecord;
  }

  // =========================================================================
  // BANK ACCOUNTS (Settlement accounts demo UI)
  // =========================================================================
  getBankAccounts(): BankAccount[] {
    return getItem<BankAccount[]>(STORAGE_KEYS.BANK_ACCOUNTS, INITIAL_BANK_ACCOUNTS);
  }

  addBankAccount(data: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'Current' | 'Savings';
    isPrimary?: boolean;
  }): BankAccount {
    const list = this.getBankAccounts();
    const last4 = data.accountNumber.slice(-4) || '1234';
    const newAccount: BankAccount = {
      id: `ba-demo-${Date.now()}`,
      accountHolderName: data.accountHolderName.trim(),
      bankName: data.bankName.trim(),
      accountNumberMasked: `•••• ${last4}`,
      ifscCode: data.ifscCode.toUpperCase().trim(),
      accountType: data.accountType,
      isPrimary: Boolean(data.isPrimary) || list.length === 0,
      createdAt: new Date().toISOString(),
    };

    let updated = [...list];
    if (newAccount.isPrimary) {
      updated = updated.map((acc) => ({ ...acc, isPrimary: false }));
    }
    updated.push(newAccount);
    setItem(STORAGE_KEYS.BANK_ACCOUNTS, updated);
    return newAccount;
  }

  updateBankAccount(id: string, updates: Partial<BankAccount>): BankAccount | null {
    const list = this.getBankAccounts();
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const updatedAccount = { ...list[index], ...updates };
    let updatedList = [...list];
    updatedList[index] = updatedAccount;

    if (updates.isPrimary) {
      updatedList = updatedList.map((acc) => (acc.id === id ? acc : { ...acc, isPrimary: false }));
    }

    setItem(STORAGE_KEYS.BANK_ACCOUNTS, updatedList);
    return updatedAccount;
  }

  deleteBankAccount(id: string): boolean {
    const list = this.getBankAccounts();
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length === list.length) return false;

    if (!filtered.some((a) => a.isPrimary) && filtered.length > 0) {
      filtered[0].isPrimary = true;
    }
    setItem(STORAGE_KEYS.BANK_ACCOUNTS, filtered);
    return true;
  }

  setPrimaryBankAccount(id: string): boolean {
    const list = this.getBankAccounts();
    if (!list.some((a) => a.id === id)) return false;

    const updated = list.map((a) => ({
      ...a,
      isPrimary: a.id === id,
    }));
    setItem(STORAGE_KEYS.BANK_ACCOUNTS, updated);
    return true;
  }

  // =========================================================================
  // PAYMENT LINKS (Linked to real backend invoices)
  // =========================================================================
  getPaymentLinks(): PaymentLink[] {
    const list = getItem<PaymentLink[]>(STORAGE_KEYS.PAYMENT_LINKS, []);
    // Filter out legacy fabricated invoice links
    return list.filter((l) => !l.invoiceNumber?.startsWith('INV-2026-'));
  }

  getPaymentLinkByInvoice(invoiceNumber: string): PaymentLink | null {
    const links = this.getPaymentLinks();
    return links.find((l) => l.invoiceNumber === invoiceNumber) || null;
  }

  createPaymentLink(data: {
    invoiceNumber: string;
    amount: number;
    currency: string;
    invoiceId?: string;
  }): PaymentLink {
    const links = this.getPaymentLinks();
    const existing = links.find((l) => l.invoiceNumber === data.invoiceNumber);
    if (existing) return existing;

    const token = `demo-BF${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newLink: PaymentLink = {
      id: `link-${Date.now()}`,
      linkToken: token,
      displayUrl: token,
      invoiceNumber: data.invoiceNumber,
      invoiceId: data.invoiceId,
      amount: data.amount,
      currency: data.currency,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    setItem(STORAGE_KEYS.PAYMENT_LINKS, [newLink, ...links]);
    return newLink;
  }

  toggleLinkStatus(id: string): PaymentLink | null {
    const links = this.getPaymentLinks();
    const link = links.find((l) => l.id === id || l.linkToken === id);
    if (!link) return null;

    link.status = link.status === 'Active' ? 'Disabled' : 'Active';
    setItem(STORAGE_KEYS.PAYMENT_LINKS, [...links]);
    return link;
  }

  // =========================================================================
  // UPI SETTINGS
  // =========================================================================
  getUpiSettings(): UpiSettings {
    return getItem<UpiSettings>(STORAGE_KEYS.UPI_SETTINGS, INITIAL_UPI_SETTINGS);
  }

  saveUpiSettings(settings: UpiSettings): UpiSettings {
    setItem(STORAGE_KEYS.UPI_SETTINGS, settings);
    return settings;
  }
}

export const mockPaymentService = new MockPaymentService();
