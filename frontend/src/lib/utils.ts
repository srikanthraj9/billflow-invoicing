import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CurrencyCode, InvoiceItem, InvoiceStatus } from './types';

/**
 * Merges Tailwind classes cleanly with clsx and twMerge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats monetary amounts with proper currency symbol and formatting.
 */
export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const currencyConfigs: Record<CurrencyCode, { locale: string; currency: string }> = {
    INR: { locale: 'en-IN', currency: 'INR' },
    USD: { locale: 'en-US', currency: 'USD' },
    EUR: { locale: 'de-DE', currency: 'EUR' },
    GBP: { locale: 'en-GB', currency: 'GBP' },
  };

  const config = currencyConfigs[currency] || currencyConfigs.INR;

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    const symbolMap: Record<CurrencyCode, string> = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    return `${symbolMap[currency] || '₹'}${amount.toLocaleString()}`;
  }
}

/**
 * Formats ISO or standard date strings to human-readable format (e.g., "Sep 01, 2026").
 */
export function formatDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formats ISO or standard date strings to human-readable date and time format (e.g., "Sep 05, 2026, 11:20 AM").
 */
export function formatDateTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Calculates subtotal, discount, tax, and total for invoice line items.
 */
export function calculateInvoiceTotals(
  items: Array<Pick<InvoiceItem, 'quantity' | 'rate'>>,
  discountPercentage: number = 0,
  taxPercentage: number = 0
) {
  const subtotal = items.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    return acc + qty * rate;
  }, 0);

  const discountRate = Math.max(0, Math.min(100, Number(discountPercentage) || 0));
  const taxRate = Math.max(0, Number(taxPercentage) || 0);

  const discountAmount = (subtotal * discountRate) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const totalAmount = taxableAmount + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Determines whether an invoice is past its due date.
 */
export function isInvoiceOverdue(dueDate: string, currentStatus: InvoiceStatus): boolean {
  if (currentStatus === 'paid') return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Generates an invoice number string given a prefix and numerical sequence.
 */
export function formatInvoiceNumber(prefix: string, sequenceNumber: number): string {
  const padded = String(sequenceNumber).padStart(4, '0');
  return `${prefix}-${padded}`;
}
