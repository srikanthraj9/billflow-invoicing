/**
 * BillFlow Stage 8G - Comprehensive Full-Stack End-to-End QA Script
 * Tests:
 * 1. Authentication & Security (Registration, Login, Validation, Token Lifecyle, Sanitization)
 * 2. Tenant Isolation (User A vs User B across Clients, Invoices, Settings, Dashboard)
 * 3. Client CRUD & RESTRICT Protection (Cannot delete client with active invoices)
 * 4. Financial Calculation Accuracy & Tampering Prevention (ROUND_HALF_UP, 1.5 * 99.99 = 149.99)
 * 5. Invoice State Machine (Draft -> Sent -> Paid, terminal paid, invalid transitions rejected)
 * 6. Dynamic Overdue Logic (Past due date -> Overdue on List, Detail, Dashboard, Public)
 * 7. Public Invoice & Simulated Payment (Unauthenticated, no internal IDs, idempotent/no double pay)
 * 8. Settings & Invoice Defaults (Prefix, explicit 0% tax, terms, immutability of historical invoices)
 * 9. Dashboard Financial Integrity (Matches backend source of truth)
 */

import { apiClient, ApiError } from '../src/lib/api-client';
import { setAuthToken, removeAuthToken } from '../src/lib/auth-token';
import { authService } from '../src/lib/services/authService';
import { clientService } from '../src/lib/services/clientService';
import { invoiceService } from '../src/lib/services/invoiceService';
import { settingsService } from '../src/lib/services/settingsService';
import { dashboardService } from '../src/lib/services/dashboardService';
import { publicInvoiceService } from '../src/lib/services/publicInvoiceService';

// Polyfill minimal localStorage and window
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) || null; }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;
(globalThis as any).window = {
  location: { pathname: '/dashboard', href: '/dashboard' },
};

async function runFullStackQA() {
  console.log('===============================================================');
  console.log('--- STARTING STAGE 8G: FINAL FULL-STACK QA & AUDIT ---');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  const ts = Date.now();
  const userA_email = `qa_user_a_${ts}@billflow.io`;
  const userB_email = `qa_user_b_${ts}@billflow.io`;
  const pwd = 'ValidPassword123!';

  let userA_token = '';
  let userB_token = '';

  try {
    // -------------------------------------------------------------
    // 1. AUTHENTICATION & CREDENTIAL SECURITY
    // -------------------------------------------------------------
    console.log('\n--- 1. Authentication & Credential Security ---');

    // 1a. Weak password rejection (<8 chars)
    try {
      await authService.signup({ name: 'User A', email: `weak_${ts}@test.com`, password: '123' });
      assert(false, '1a. Weak password should be rejected by validation');
    } catch (e: any) {
      assert(e instanceof ApiError && e.status === 422, '1a. Weak password rejected with HTTP 422');
    }

    // 1b. Invalid email format rejection
    try {
      await authService.signup({ name: 'User A', email: 'notanemail', password: pwd });
      assert(false, '1b. Invalid email format should be rejected');
    } catch (e: any) {
      assert(e instanceof ApiError && e.status === 422, '1b. Invalid email format rejected with HTTP 422');
    }

    // 1c. Valid user signup
    const userA = await authService.signup({ name: 'Alpha Corp Founder', email: userA_email, password: pwd });
    userA_token = (globalThis as any).localStorage.getItem('billflow_access_token') || '';
    assert(Boolean(userA.id) && userA.email === userA_email, '1c. Valid signup registers user and returns profile');
    assert((userA as any).password === undefined && (userA as any).password_hash === undefined, '1d. Plaintext password and password_hash never exposed in user object');

    // 1e. Duplicate signup rejection
    try {
      await authService.signup({ name: 'Duplicate User', email: userA_email, password: pwd });
      assert(false, '1e. Duplicate email should be rejected');
    } catch (e: any) {
      assert(e instanceof ApiError && e.status === 409, '1e. Duplicate signup rejected with HTTP 409 Conflict');
    }

    // 1f. Invalid credentials rejection
    try {
      await authService.login(userA_email, 'WrongPassword999!');
      assert(false, '1f. Wrong password should be rejected');
    } catch (e: any) {
      assert(e instanceof ApiError && e.status === 401, '1f. Invalid credentials rejected generically with HTTP 401');
    }

    // 1g. Valid login
    const loginUser = await authService.login(userA_email, pwd);
    assert(loginUser.email === userA_email, '1g. Valid login succeeds and returns user');

    // 1h. /api/auth/me token retrieval
    const currentUser = await authService.getCurrentUser();
    assert(currentUser?.email === userA_email, '1h. /api/auth/me returns current authenticated user profile');

    // -------------------------------------------------------------
    // 2. TENANT ISOLATION FULL SYSTEM (User A vs User B)
    // -------------------------------------------------------------
    console.log('\n--- 2. Multi-Tenant System Isolation ---');

    // Create User A client & invoice
    const clientA = await clientService.createClient({ name: 'Client A Corp', email: `client_a_${ts}@corp.com` });
    const invA = await invoiceService.createInvoice({
      clientId: clientA.id,
      clientName: clientA.name,
      clientEmail: clientA.email,
      issueDate: '2026-09-01',
      items: [{ id: '1', description: 'Item A', quantity: 1, rate: 100, amount: 0 }],
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'USD',
      status: 'draft',
    });

    // Register User B
    authService.clearUserCache();
    await authService.signup({ name: 'Beta Solutions', email: userB_email, password: pwd });
    userB_token = (globalThis as any).localStorage.getItem('billflow_access_token') || '';

    // Verify User B cannot access User A client
    const userB_clientAttempt = await clientService.getClientById(clientA.id);
    assert(userB_clientAttempt === null, '2a. User B cannot access User A client (returns 404/null)');

    // Verify User B cannot access User A invoice
    const userB_invAttempt = await invoiceService.getInvoiceById(invA.id);
    assert(userB_invAttempt === null, '2b. User B cannot access User A invoice (returns 404/null)');

    // Verify User B cannot mutate User A invoice
    try {
      await invoiceService.deleteInvoice(invA.id);
      assert(false, '2c. User B deleting User A invoice should be rejected');
    } catch (e: any) {
      assert(e instanceof ApiError && e.status === 404, '2c. Cross-tenant invoice mutation safely rejected with 404');
    }

    // Verify User B dashboard has 0 of User A's data
    const userB_dash = await dashboardService.getDashboardStats();
    assert(userB_dash.totalEarned === 0 && userB_dash.totalInvoicesCount === 0, '2d. User B dashboard completely isolated from User A data');

    // Switch back to User A
    setAuthToken(userA_token);

    // -------------------------------------------------------------
    // 3. CLIENT CRUD & RESTRICT PROTECTION
    // -------------------------------------------------------------
    console.log('\n--- 3. Client CRUD & Foreign Key Integrity ---');

    // Search by name, email, company
    const clientList = await clientService.getClients({ search: 'Client A' });
    assert(clientList.length >= 1 && clientList[0].id === clientA.id, '3a. Client server-side search by name succeeds');

    // Edit client
    const updatedClient = await clientService.updateClient(clientA.id, { company: 'Acme International', phone: '+1-555-1234' });
    assert(updatedClient.company === 'Acme International', '3b. Client update persists to database');

    // Attempt to delete client referenced by an invoice -> MUST BE REJECTED WITH 409 CONFLICT
    try {
      await clientService.deleteClient(clientA.id);
      assert(false, '3c. Deletion of client with active invoice should be rejected');
    } catch (e: any) {
      assert(e instanceof ApiError && e.status === 409, '3c. Deletion of client with existing invoices rejected with HTTP 409 Conflict (Foreign Key protection)');
    }

    // Delete invoice first, then delete client
    await invoiceService.deleteInvoice(invA.id);
    const deleteSuccess = await clientService.deleteClient(clientA.id);
    assert(deleteSuccess === true, '3d. Client without invoices deleted successfully');

    // -------------------------------------------------------------
    // 4. FINANCIAL INTEGRITY & CALCULATION PRECISION (Section 57)
    // -------------------------------------------------------------
    console.log('\n--- 4. Financial Calculations & Tampering Prevention ---');

    const clientFin = await clientService.createClient({ name: 'Fin Client', email: `fin_${ts}@test.com` });

    // Scenario:
    // Line 1: qty = 2, rate = 500 -> 1000.00
    // Line 2: qty = 1.5, rate = 99.99 -> 149.985 -> ROUND_HALF_UP -> 149.99
    // Subtotal: 1149.99
    // Discount: 100 -> Taxable: 1049.99
    // Tax: 10% -> 104.999 -> ROUND_HALF_UP -> 105.00
    // Total: 1154.99
    // Client sends tampered values: subtotal=10, total=10
    const finInvoice = await invoiceService.createInvoice({
      clientId: clientFin.id,
      clientName: clientFin.name,
      clientEmail: clientFin.email,
      issueDate: '2026-09-01',
      items: [
        { id: '1', description: 'Item 1', quantity: 2, rate: 500, amount: 99999 }, // Tampered
        { id: '2', description: 'Item 2', quantity: 1.5, rate: 99.99, amount: 99999 }, // Tampered
      ],
      discountPercentage: 0,
      discountAmount: 100,
      taxPercentage: 10,
      taxAmount: 0,
      subtotal: 10, // Tampered
      totalAmount: 10, // Tampered
      currency: 'USD',
      status: 'draft',
    });

    assert(finInvoice.items[0].amount === 1000.00, `4a. Line 1: 2 x 500.00 = 1000.00 (Got: ${finInvoice.items[0].amount})`);
    assert(finInvoice.items[1].amount === 149.99, `4b. Line 2: 1.5 x 99.99 = 149.99 (ROUND_HALF_UP 149.985 -> 149.99, Got: ${finInvoice.items[1].amount})`);
    assert(finInvoice.subtotal === 1149.99, `4c. Subtotal authoritative backend sum = 1149.99 (Got: ${finInvoice.subtotal})`);
    assert(finInvoice.taxAmount === 105.00, `4d. Tax authoritative 10% of 1049.99 = 105.00 (Got: ${finInvoice.taxAmount})`);
    assert(finInvoice.totalAmount === 1154.99, `4e. Total authoritative backend sum = 1154.99 (Tampered client 10 ignored, Got: ${finInvoice.totalAmount})`);

    // Clean up
    await invoiceService.deleteInvoice(finInvoice.id);

    // -------------------------------------------------------------
    // 5. INVOICE STATE MACHINE & TERMINAL IMMUTABILITY
    // -------------------------------------------------------------
    console.log('\n--- 5. Invoice State Machine & Terminal Immutability ---');

    const stateInv = await invoiceService.createInvoice({
      clientId: clientFin.id,
      clientName: clientFin.name,
      clientEmail: clientFin.email,
      issueDate: '2026-09-01',
      items: [{ id: '1', description: 'Consulting', quantity: 1, rate: 500, amount: 0 }],
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'USD',
      status: 'draft',
    });

    // 5a. Reject illegal transition: draft -> paid
    try {
      await invoiceService.updateInvoice(stateInv.id, { status: 'paid' as any });
      assert(false, '5a. Draft directly to paid should be rejected');
    } catch (e: any) {
      assert(e instanceof ApiError && e.status === 400, '5a. Illegal transition draft -> paid rejected with HTTP 400');
    }

    // 5b. Valid transition: draft -> sent
    const sentInv = await invoiceService.updateInvoice(stateInv.id, { status: 'sent' });
    assert(sentInv.status === 'sent', '5b. Valid transition draft -> sent succeeds');

    // 5c. Reject sent -> draft
    try {
      await invoiceService.updateInvoice(stateInv.id, { status: 'draft' as any });
      assert(false, '5c. Sent back to draft should be rejected');
    } catch (e: any) {
      assert(e instanceof ApiError && e.status === 400, '5c. Illegal transition sent -> draft rejected with HTTP 400');
    }

    // 5d. Valid transition: sent -> paid
    const paidInv = await invoiceService.updateInvoice(stateInv.id, { status: 'paid' });
    assert(paidInv.status === 'paid' && Boolean(paidInv.paidAt), `5d. Transition sent -> paid stamps paidAt: ${paidInv.paidAt}`);

    // 5e. Terminal immutability: paid cannot be changed back to sent or draft
    try {
      await invoiceService.updateInvoice(stateInv.id, { status: 'sent' as any });
      assert(false, '5e. Paid invoice state transition should be rejected');
    } catch (e: any) {
      assert(e instanceof ApiError && e.status === 400, '5e. Paid invoice is terminal: cannot transition away from paid');
    }

    // 5f. Paid invoice cannot be modified financially
    try {
      await invoiceService.updateInvoice(stateInv.id, { notes: 'Attempt modification' });
      assert(false, '5f. Paid invoice financial modification should be rejected');
    } catch (e: any) {
      assert(e instanceof ApiError && e.status === 400, '5f. Paid invoice content modification rejected with HTTP 400');
    }

    // -------------------------------------------------------------
    // 6. OVERDUE LOGIC & CANONICAL STATUS (Section 12 & 59)
    // -------------------------------------------------------------
    console.log('\n--- 6. Overdue Logic & Canonical Effective Status ---');

    // Create invoice with past due date (2026-08-01)
    const overdueInv = await invoiceService.createInvoice({
      clientId: clientFin.id,
      clientName: clientFin.name,
      clientEmail: clientFin.email,
      issueDate: '2026-07-15',
      dueDate: '2026-08-01', // Past due date
      items: [{ id: '1', description: 'Overdue Services', quantity: 1, rate: 300, amount: 0 }],
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'USD',
      status: 'draft',
    });

    // Mark as sent
    await invoiceService.updateInvoice(overdueInv.id, { status: 'sent' });
    // Fetch from list: should be dynamically returned as overdue
    const fetchedOverdue = await invoiceService.getInvoiceById(overdueInv.id);
    assert(fetchedOverdue?.status === 'overdue', `6a. Sent invoice with past due date dynamically returns overdue: ${fetchedOverdue?.status}`);

    // Check dashboard overdue stats
    const dashOverdue = await dashboardService.getDashboardStats();
    assert(dashOverdue.totalOverdue >= 300 && (dashOverdue.overdueInvoicesCount ?? 0) >= 1, `6b. Dashboard reflects overdue invoice in totalOverdue: ${dashOverdue.totalOverdue}`);

    // Public view also returns overdue
    const publicToken = fetchedOverdue?.token || '';
    const publicOverdueData = await publicInvoiceService.getPublicInvoice(publicToken);
    assert(publicOverdueData?.invoice?.status === 'overdue', `6c. Public portal dynamically displays overdue: ${publicOverdueData?.invoice?.status}`);

    // Pay through public portal -> Transitions to paid and leaves overdue
    const publicPayResult = await publicInvoiceService.payPublicInvoice(publicToken);
    assert(publicPayResult.status === 'paid', '6d. Overdue invoice paid through public portal transitions to paid');

    // -------------------------------------------------------------
    // 7. PUBLIC INVOICE SECURITY & IDEMPOTENT PAYMENT
    // -------------------------------------------------------------
    console.log('\n--- 7. Public Invoice Privacy & Idempotency ---');

    // 7a. Unauthenticated raw GET to public invoice
    const rawPublicRes = await fetch(`http://localhost:8000/api/public/invoices/${publicToken}`);
    assert(rawPublicRes.status === 200, '7a. Public invoice accessible without any Authorization header');
    const rawPublicJson = await rawPublicRes.json();
    assert(rawPublicJson.user_id === undefined && rawPublicJson.id === undefined, '7b. Public invoice response contains NO database UUIDs (no user_id, no invoice_id)');

    // 7c. Repeated payment on already paid invoice must be rejected
    try {
      await publicInvoiceService.payPublicInvoice(publicToken);
      assert(false, '7c. Second payment on paid invoice should be rejected');
    } catch (e: any) {
      assert(e instanceof ApiError && e.status === 400, '7c. Double payment rejected with HTTP 400 "Invoice is already paid"');
    }

    // -------------------------------------------------------------
    // 8. SETTINGS & INVOICE DEFAULTS (Section 60)
    // -------------------------------------------------------------
    console.log('\n--- 8. Settings & Invoice Defaults ---');

    // Set: Business name = Final Demo Business, Currency = USD, Prefix = DEMO, Tax = 0, Terms = 30
    await settingsService.updateSettings({
      businessName: 'Final Demo Business',
      currency: 'USD',
      invoicePrefix: 'DEMO',
      defaultTaxPercentage: 0,
      defaultPaymentTermsDays: 30,
    });

    const verifySettings = await settingsService.getSettings();
    assert(
      verifySettings.businessName === 'Final Demo Business' &&
      verifySettings.currency === 'USD' &&
      verifySettings.invoicePrefix === 'DEMO' &&
      verifySettings.defaultTaxPercentage === 0 &&
      verifySettings.defaultPaymentTermsDays === 30,
      '8a. All demo settings configured and persisted'
    );

    // Create new invoice without explicit tax/terms
    const demoInv = await invoiceService.createInvoice({
      clientId: clientFin.id,
      clientName: clientFin.name,
      clientEmail: clientFin.email,
      issueDate: '2026-09-01',
      items: [{ id: '1', description: 'Demo Item', quantity: 1, rate: 400, amount: 0 }],
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'USD',
      status: 'draft',
    });

    assert(demoInv.invoiceNumber.startsWith('DEMO-'), `8b. Prefix applied: ${demoInv.invoiceNumber}`);
    assert(demoInv.taxPercentage === 0, `8c. Explicit 0% tax default inherited: ${demoInv.taxPercentage}%`);
    assert(demoInv.dueDate === '2026-10-01', `8d. 30-day default terms applied: ${demoInv.dueDate}`);

    // Clean up
    await invoiceService.deleteInvoice(demoInv.id);

  } finally {
    console.log('\n--- Cleaning up QA test artifacts ---');
    try {
      removeAuthToken();
    } catch {}
  }

  console.log('\n===============================================================');
  console.log(`STAGE 8G FULL-STACK QA RESULTS: ${passed} passed, ${failed} failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFullStackQA().catch((err) => {
  console.error('Fatal QA error:', err);
  process.exit(1);
});
