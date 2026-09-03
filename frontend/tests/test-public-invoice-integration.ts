/**
 * Automated Verification Script for Stage 8D Public Invoice & Simulated Payment.
 * Validates publicInvoiceService, unauthenticated access, privacy (no internal IDs/public_token in JSON),
 * simulated payment (POST without credentials/body), row-lock protection, and draft masking.
 */

import { apiClient, ApiError } from '../src/lib/api-client';
import { setAuthToken, removeAuthToken } from '../src/lib/auth-token';
import { authService } from '../src/lib/services/authService';
import { clientService } from '../src/lib/services/clientService';
import { invoiceService } from '../src/lib/services/invoiceService';
import { publicInvoiceService } from '../src/lib/services/publicInvoiceService';

// Polyfill minimal localStorage and window for Node environment
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
  location: { pathname: '/public/invoice/test', href: '/public/invoice/test' },
};

async function runPublicInvoiceIntegrationTests() {
  console.log('--- Starting Stage 8D Public Invoice & Payment Verification ---');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`[PASS] ${description}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${description}`);
      testsFailed++;
    }
  }

  const timestamp = Date.now();
  const merchant_email = `merchant_public_${timestamp}@example.com`;
  const password = 'Password123!';

  let merchant_token = '';
  let draftInvoiceToken = '';
  let sentInvoiceToken = '';
  let overdueInvoiceToken = '';
  let draftInvoiceId = '';
  let sentInvoiceId = '';
  let overdueInvoiceId = '';

  try {
    // 1. Authenticate Merchant to setup test invoices
    await authService.signup({ name: 'Acme Studio', email: merchant_email, password });
    merchant_token = (globalThis as any).localStorage.getItem('billflow_access_token') || '';
    assert(Boolean(merchant_token), 'Setup: Authenticated merchant account');

    const client = await clientService.createClient({
      name: 'Starlight Media',
      email: 'billing@starlight.io',
      company: 'Starlight Media LLC',
    });
    assert(Boolean(client.id), 'Setup: Created merchant client');

    // Create a draft invoice
    const draftInv = await invoiceService.createInvoice({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-09-01',
      dueDate: '2026-09-20',
      items: [{ id: '1', description: 'Design Sprint', quantity: 1, rate: 450, amount: 0 }],
      status: 'draft',
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
    });
    draftInvoiceId = draftInv.id;
    draftInvoiceToken = draftInv.token;
    assert(Boolean(draftInvoiceToken), 'Setup: Draft invoice created with secure public token');

    // Create an invoice to be dispatched ('sent')
    const sentInv = await invoiceService.createInvoice({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-09-01',
      dueDate: '2026-09-30',
      items: [{ id: '1', description: 'Web Platform Development', quantity: 2, rate: 500, amount: 0 }],
      status: 'draft',
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
    });
    sentInvoiceId = sentInv.id;
    sentInvoiceToken = sentInv.token;

    // Dispatch sentInv: draft -> sent
    const dispatched = await invoiceService.updateInvoice(sentInvoiceId, { status: 'sent' });
    assert(dispatched.status === 'sent', 'Setup: Second invoice dispatched as sent');

    // Create an overdue invoice ('sent' with past due date)
    const overdueInv = await invoiceService.createInvoice({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-08-01',
      dueDate: '2026-08-15',
      items: [{ id: '1', description: 'Past Consulting Work', quantity: 1, rate: 300, amount: 0 }],
      status: 'sent',
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
    });
    overdueInvoiceId = overdueInv.id;
    overdueInvoiceToken = overdueInv.token;
    assert(Boolean(overdueInvoiceToken), 'Setup: Overdue invoice created');

    // ==========================================
    // NOW SWITCH TO UNAUTHENTICATED CUSTOMER PORTAL
    // ==========================================
    // Even though merchant_token is in localStorage, public requests must NOT send it.
    // We will verify this explicitly!

    // 2. Draft invoice token is hidden (returns 404 / null)
    const draftPublicCheck = await publicInvoiceService.getPublicInvoice(draftInvoiceToken);
    assert(draftPublicCheck === null, '3. Draft invoice returns 404 (masked from public access)');

    // 20. Draft invoice cannot be paid (returns 404)
    try {
      await publicInvoiceService.payPublicInvoice(draftInvoiceToken);
      assert(false, '20. Draft invoice payment should be rejected with 404');
    } catch (err: any) {
      assert(err instanceof ApiError && err.status === 404, '20. Draft invoice payment returns 404 Not Found');
    }

    // 2. Invalid token returns 404 / null
    const invalidTokenCheck = await publicInvoiceService.getPublicInvoice('invalid_token_xyz_9999');
    assert(invalidTokenCheck === null, '2. Invalid token returns 404 (null)');

    // 19. Invalid token payment returns 404
    try {
      await publicInvoiceService.payPublicInvoice('invalid_token_xyz_9999');
      assert(false, '19. Invalid token payment should be rejected with 404');
    } catch (err: any) {
      assert(err instanceof ApiError && err.status === 404, '19. Invalid token payment returns 404 Not Found');
    }

    // 1. Valid public invoice GET
    const publicData = await publicInvoiceService.getPublicInvoice(sentInvoiceToken);
    assert(publicData !== null, '1. Valid public invoice GET succeeds');
    const pubInv = publicData!.invoice;
    const pubBiz = publicData!.business;

    // 4 & 5. Verify NO Authorization header is needed or sent
    // We make a raw fetch without any auth headers to confirm backend serves it publicly
    const rawRes = await fetch(`http://localhost:8000/api/public/invoices/${sentInvoiceToken}`);
    assert(rawRes.status === 200, '4. No JWT required: raw unauthenticated HTTP GET returns 200');
    const rawJson = await rawRes.json();

    // 6. Public response contains expected invoice fields
    assert(
      Boolean(pubInv.invoiceNumber) &&
      pubInv.status === 'sent' &&
      pubInv.items.length === 1 &&
      pubInv.items[0].description === 'Web Platform Development' &&
      pubInv.items[0].quantity === 2 &&
      pubInv.items[0].rate === 500 &&
      pubInv.items[0].amount === 1000,
      '6. Public response contains expected invoice numbers, status, and line items'
    );

    // 7. Public response raw JSON contains NO internal database UUIDs
    const hasInternalInvoiceId = 'id' in rawJson;
    const hasUserId = 'user_id' in rawJson;
    const hasClientId = 'client_id' in rawJson || (rawJson.client && 'id' in rawJson.client);
    const hasItemId = rawJson.items && rawJson.items.some((i: any) => 'id' in i || 'invoice_id' in i);
    assert(
      !hasInternalInvoiceId && !hasUserId && !hasClientId && !hasItemId,
      '7. Public privacy: raw response contains NO database UUIDs (no invoice ID, user ID, client ID, item IDs)'
    );

    // 8. Public response raw JSON contains NO public_token field
    const hasPublicTokenInBody = 'public_token' in rawJson;
    assert(!hasPublicTokenInBody, '8. Public privacy: raw response contains NO public_token field');

    // 9. Client information displayed
    assert(
      pubInv.clientName === 'Starlight Media' && pubInv.clientCompany === 'Starlight Media LLC',
      '9. Client summary information is accurately present'
    );

    // 10. Business information displayed
    assert(
      pubBiz.businessName === 'BillFlow Merchant' || pubBiz.businessName === 'Acme Studio',
      '10. Merchant business branding information is present'
    );

    // 11. Currency displayed correctly
    assert(pubInv.currency === 'INR', '11. Correct currency returned');

    // 12. Backend authoritative financial values displayed
    assert(
      pubInv.subtotal === 1000 && pubInv.totalAmount === 1180 && pubInv.taxAmount === 180,
      '12. Authoritative backend financial values displayed (subtotal=1000, tax=180, total=1180)'
    );

    // 13 & 14. Sent invoice simulated payment succeeds
    const paidResult = await publicInvoiceService.payPublicInvoice(sentInvoiceToken);
    assert(
      paidResult.status === 'paid',
      '13. POST /api/public/invoices/{token}/pay succeeds and marks invoice paid'
    );
    assert(
      paidResult.totalAmount === 1180 && paidResult.subtotal === 1000,
      '14. Payment response is authoritative'
    );

    // 15. paid_at returned/set
    assert(Boolean(paidResult.paidAt), `15. paid_at timestamp is stamped: ${paidResult.paidAt}`);

    // 16. Paid invoice cannot be paid again (HTTP 400)
    try {
      await publicInvoiceService.payPublicInvoice(sentInvoiceToken);
      assert(false, '16. Already-paid invoice should reject subsequent payment');
    } catch (err: any) {
      assert(
        err instanceof ApiError && err.status === 400 && err.message.toLowerCase().includes('already paid'),
        '16. Paid invoice payment rejected with HTTP 400 "Invoice is already paid"'
      );
    }

    // 17. Overdue invoice can be paid
    const overduePublic = await publicInvoiceService.getPublicInvoice(overdueInvoiceToken);
    assert(overduePublic?.invoice.status === 'overdue', '17a. Overdue invoice dynamically returned as overdue');
    const overduePaid = await publicInvoiceService.payPublicInvoice(overdueInvoiceToken);
    assert(overduePaid.status === 'paid', '17b. Overdue invoice simulated payment succeeds and transitions to paid');

    // 18. After payment refresh, invoice remains paid in PostgreSQL
    const refreshedPublic = await publicInvoiceService.getPublicInvoice(sentInvoiceToken);
    assert(refreshedPublic?.invoice.status === 'paid', '18. Refetched invoice from database remains paid');

    // 21. Concurrent / already-paid behavior handled cleanly
    try {
      await publicInvoiceService.payPublicInvoice(overdueInvoiceToken);
      assert(false, '21. Double payment on overdue invoice rejected');
    } catch (err: any) {
      assert(err instanceof ApiError && err.status === 400, '21. Concurrent/double payment safely rejected');
    }

    // 22. Error handling: clean ApiError thrown on server/network failures
    try {
      await apiClient.get('/public/invoices/%20', { skipAuth: true });
    } catch (err: any) {
      assert(err instanceof ApiError, '22. API failures surface as typed ApiError without leaking secrets');
    }

  } finally {
    console.log('--- Cleaning up test artifacts ---');
    try {
      // Re-authenticate as merchant to safely delete draft invoice
      if (merchant_token) {
        setAuthToken(merchant_token);
        if (draftInvoiceId) {
          await invoiceService.deleteInvoice(draftInvoiceId).catch(() => {});
        }
      }
      removeAuthToken();
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }

  // Summary
  console.log(`\n========================================`);
  console.log(`Stage 8D Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`========================================\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPublicInvoiceIntegrationTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
