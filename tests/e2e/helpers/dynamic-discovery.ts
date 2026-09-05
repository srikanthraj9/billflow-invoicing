/**
 * Dynamic Real-Data Discovery Helper
 * Safely discovers existing backend records without hardcoding any identifiers.
 */

export interface DiscoveredInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  totalAmount: number;
  issueDate: string;
  dueDate: string;
  status: string;
  token?: string;
}

export interface DiscoveredClient {
  id: string;
  name: string;
  email: string;
  company?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Discovers the first available real invoice from backend API or returns null.
 * Strictly read-only; never creates or mutates records.
 */
export async function discoverRealInvoice(token?: string): Promise<DiscoveredInvoice | null> {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_URL}/invoices`, { headers });
    if (!res.ok) return null;

    const data = await res.json();
    const invoices = Array.isArray(data) ? data : data.items || [];
    if (invoices.length === 0) return null;

    const inv = invoices[0];
    return {
      id: inv.id || inv._id,
      invoiceNumber: inv.invoice_number || inv.invoiceNumber,
      clientName: inv.client?.name || inv.client_name || inv.clientName || 'Valued Client',
      clientEmail: inv.client?.email || inv.client_email || inv.clientEmail || '',
      totalAmount: Number(inv.total_amount ?? inv.totalAmount ?? 0),
      issueDate: inv.issue_date || inv.issueDate || '',
      dueDate: inv.due_date || inv.dueDate || '',
      status: inv.status || 'draft',
      token: inv.token || inv.public_token || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Discovers the first available real client from backend API or returns null.
 */
export async function discoverRealClient(token?: string): Promise<DiscoveredClient | null> {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_URL}/clients`, { headers });
    if (!res.ok) return null;

    const data = await res.json();
    const clients = Array.isArray(data) ? data : data.items || [];
    if (clients.length === 0) return null;

    const c = clients[0];
    return {
      id: c.id || c._id,
      name: c.name || '',
      email: c.email || '',
      company: c.company || undefined,
    };
  } catch {
    return null;
  }
}
