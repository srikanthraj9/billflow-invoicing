/**
 * Automated Verification Script for Stage 8C Frontend Invoice Integration.
 * Validates invoiceService, financial source-of-truth calculations, server-side filtering,
 * status transitions, immutability, and tenant isolation against live FastAPI backend.
 */

import { apiClient, ApiError } from '../src/lib/api-client';
import { setAuthToken, removeAuthToken } from '../src/lib/auth-token';
import { authService } from '../src/lib/services/authService';
import { clientService } from '../src/lib/services/clientService';
import { invoiceService } from '../src/lib/services/invoiceService';

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
  location: { pathname: '/invoices', href: '/invoices' },
};

async function runInvoiceIntegrationTests() {
  console.log('--- Starting Stage 8C Invoice Integration Verification ---');
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
  const userA_email = `invoice_test_a_${timestamp}@example.com`;
  const userB_email = `invoice_test_b_${timestamp}@example.com`;
  const password = 'Password123!';

  let userA_token = '';
  let clientA_id = '';
  let draftInvoice_id = '';
  let transitionInvoice_id = '';
  let deleteTestInvoice_id = '';

  try {
    // 1. Authenticate as User A
    await authService.signup({ name: 'Invoice User A', email: userA_email, password });
    const userA = await authService.getCurrentUser();
    userA_token = (globalThis as any).localStorage.getItem('billflow_access_token') || '';
    assert(Boolean(userA) && userA?.email === userA_email, '1. Authenticated as User A');

    // 2. Empty invoice list for new user
    const initialInvoices = await invoiceService.getInvoices();
    assert(Array.isArray(initialInvoices) && initialInvoices.length === 0, '2. New user starts with 0 invoices');

    // Setup: Create a test client for User A
    const client = await clientService.createClient({
      name: 'Global Tech Corp',
      email: 'finance@globaltech.com',
      company: 'Global Technologies Inc.',
    });
    clientA_id = client.id;
    assert(Boolean(clientA_id), 'Setup: Created test client for User A');

    // 3. Create draft invoice with line items, discount, and tax
    // Items: 2 x 150 = 300. Discount: flat 20. Taxable base: 280. Tax 10%: 28. Total: 308.
    const createdInvoice = await invoiceService.createInvoice({
      clientId: clientA_id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-09-01',
      dueDate: '2026-09-20',
      items: [
        { id: '1', description: 'Web Architecture Consulting', quantity: 2, rate: 150, amount: 0 },
      ],
      discountAmount: 20,
      discountPercentage: 0,
      taxPercentage: 10,
      taxAmount: 0,
      subtotal: 0,
      totalAmount: 0,
      currency: 'INR',
      status: 'draft',
      notes: 'Initial test invoice',
    });
    draftInvoice_id = createdInvoice.id;

    // 4. Verify backend generated invoice number
    assert(
      createdInvoice.invoiceNumber.startsWith('INV-'),
      `4. Backend generates formatted invoice number: ${createdInvoice.invoiceNumber}`
    );

    // 5-9. Verify authoritative backend financial calculations
    assert(createdInvoice.subtotal === 300, `6. Authoritative backend subtotal: ${createdInvoice.subtotal} === 300`);
    assert(createdInvoice.discountAmount === 20, `8. Authoritative backend discount: ${createdInvoice.discountAmount} === 20`);
    assert(createdInvoice.taxAmount === 28, `7. Authoritative backend tax: ${createdInvoice.taxAmount} === 28`);
    assert(createdInvoice.totalAmount === 308, `9. Authoritative backend total: ${createdInvoice.totalAmount} === 308`);
    assert(createdInvoice.items[0].amount === 300, `5. Correct calculated line-item amount: ${createdInvoice.items[0].amount} === 300`);
    assert(createdInvoice.status === 'draft', '3. Status is draft');

    // 10. Explicit 0% tax remains 0%
    const zeroTaxInv = await invoiceService.createInvoice({
      clientId: clientA_id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-09-01',
      items: [{ id: '1', description: 'Tax Exempt Service', quantity: 1, rate: 100, amount: 0 }],
      taxPercentage: 0,
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
      status: 'draft',
    });
    assert(zeroTaxInv.taxAmount === 0 && zeroTaxInv.totalAmount === 100, '10. Explicit 0% tax remains exactly 0%');
    await invoiceService.deleteInvoice(zeroTaxInv.id);

    // 11. Default tax applied when tax is omitted
    // Default tax rate in BusinessSettings is 18.00%. Subtotal 100 -> Tax 18, Total 118.
    const defaultTaxInv = await invoiceService.createInvoice({
      clientId: clientA_id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-09-01',
      items: [{ id: '1', description: 'Standard Service', quantity: 1, rate: 100, amount: 0 }],
      // taxPercentage omitted
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
      status: 'draft',
    });
    assert(defaultTaxInv.taxAmount === 18 && defaultTaxInv.totalAmount === 118, '11. Default tax applied when tax_percentage is omitted');
    await invoiceService.deleteInvoice(defaultTaxInv.id);

    // 12. Explicit due date preserved
    assert(createdInvoice.dueDate === '2026-09-20', '12. Explicit due date remains unchanged');

    // 13. Default payment terms used when due date omitted
    const omittedDueDateInv = await invoiceService.createInvoice({
      clientId: clientA_id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-09-01',
      // dueDate omitted
      items: [{ id: '1', description: 'Service', quantity: 1, rate: 100, amount: 0 }],
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
      status: 'draft',
    });
    // Default payment terms is 14 days -> 2026-09-01 + 14 = 2026-09-15
    assert(omittedDueDateInv.dueDate === '2026-09-15', '13. Default payment terms (14 days) applied when due date omitted');
    await invoiceService.deleteInvoice(omittedDueDateInv.id);

    // 14. Get invoice by ID
    const singleInv = await invoiceService.getInvoiceById(draftInvoice_id);
    assert(
      singleInv !== null && singleInv.id === draftInvoice_id && singleInv.clientName === 'Global Tech Corp',
      '14. getInvoiceById fetches authoritative invoice with client relation'
    );

    // 15. Server-side search by invoice number
    const searchByNumber = await invoiceService.getInvoices({ search: createdInvoice.invoiceNumber });
    assert(searchByNumber.length === 1 && searchByNumber[0].id === draftInvoice_id, '15. Search by invoice number');

    // 16. Server-side search by client name
    const searchByClient = await invoiceService.getInvoices({ search: 'Global Tech' });
    assert(searchByClient.length === 1 && searchByClient[0].id === draftInvoice_id, '16. Search by client name');

    // 17. Server-side status filter
    const draftList = await invoiceService.getInvoices({ status: 'draft' });
    const paidList = await invoiceService.getInvoices({ status: 'paid' });
    assert(draftList.length >= 1 && paidList.length === 0, '17. Status filter distinguishes draft from paid');

    // 18. Server-side client filter
    const clientFiltered = await invoiceService.getInvoices({ clientId: clientA_id });
    assert(clientFiltered.length >= 1 && clientFiltered[0].clientId === clientA_id, '18. Client filter restricts to specified client');

    // 19. Server-side sorting
    const sorted = await invoiceService.getInvoices({ sortBy: 'highest_amount' });
    assert(Array.isArray(sorted) && sorted.length >= 1, '19. Sorting by highest_amount returns valid list');

    // 20-21. Total count
    const count = await invoiceService.getTotalCount();
    assert(count >= 1, `21. getTotalCount returns accurate count: ${count}`);

    // 22. Update allowed invoice
    const updatedInv = await invoiceService.updateInvoice(draftInvoice_id, {
      notes: 'Updated invoice notes',
      discountAmount: 10,
      taxPercentage: 10,
    });
    // Subtotal 300, discount 10 -> taxable 290, tax 10% = 29, total = 319
    assert(
      updatedInv.notes === 'Updated invoice notes' && updatedInv.totalAmount === 319,
      '22. updateInvoice updates notes and recalculates authoritative financial totals'
    );

    // 23. Invalid invoice ID returns null (404 handled)
    const notFoundInv = await invoiceService.getInvoiceById('00000000-0000-0000-0000-000000000000');
    assert(notFoundInv === null, '23. Non-existent invoice UUID returns null');

    // 24. Create invoice for state machine transitions
    const transitionInv = await invoiceService.createInvoice({
      clientId: clientA_id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-09-01',
      dueDate: '2026-09-30',
      items: [{ id: '1', description: 'Transition Service', quantity: 1, rate: 500, amount: 0 }],
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
      status: 'draft',
    });
    transitionInvoice_id = transitionInv.id;

    // 25. Draft deletion works
    const draftToDelete = await invoiceService.createInvoice({
      clientId: clientA_id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-09-01',
      items: [{ id: '1', description: 'Temporary Item', quantity: 1, rate: 50, amount: 0 }],
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
      status: 'draft',
    });
    deleteTestInvoice_id = draftToDelete.id;
    const deleteSuccess = await invoiceService.deleteInvoice(deleteTestInvoice_id);
    assert(deleteSuccess === true, '25. Draft invoice deletion succeeds with 204');
    const verifyDeleted = await invoiceService.getInvoiceById(deleteTestInvoice_id);
    assert(verifyDeleted === null, '25b. Deleted draft invoice is no longer retrievable');

    // 27. Valid status transition: draft -> sent
    const sentInv = await invoiceService.updateInvoice(transitionInvoice_id, { status: 'sent' });
    assert(sentInv.status === 'sent', '27. Valid transition draft -> sent succeeds');

    // 26. Protected invoice deletion returns error
    try {
      await invoiceService.deleteInvoice(transitionInvoice_id);
      assert(false, '26. Sent invoice deletion should be rejected');
    } catch (err: any) {
      assert(err instanceof ApiError && err.status === 400, '26. Deletion of sent invoice rejected with HTTP 400');
    }

    // 28. Invalid status transition: sent -> draft rejected
    try {
      await invoiceService.updateInvoice(transitionInvoice_id, { status: 'draft' });
      assert(false, '28. sent -> draft should be rejected');
    } catch (err: any) {
      assert(
        err instanceof ApiError && err.status === 400 && err.message.includes('Invalid invoice status transition'),
        '28. Invalid transition sent -> draft rejected by state machine'
      );
    }

    // Transition: sent -> paid
    const paidInv = await invoiceService.updateInvoice(transitionInvoice_id, { status: 'paid' });
    assert(paidInv.status === 'paid' && Boolean(paidInv.paidAt), '27b. Transition sent -> paid succeeds with paidAt timestamp');

    // 29. Paid invoice remains immutable
    try {
      await invoiceService.updateInvoice(transitionInvoice_id, { notes: 'Attempted edit' });
      assert(false, '29. Paid invoice should reject edits');
    } catch (err: any) {
      assert(
        err instanceof ApiError && err.status === 400 && err.message.includes('Paid invoices cannot be modified'),
        '29. Paid invoice edit rejected with HTTP 400'
      );
    }

    // 30. Overdue status dynamically returned
    // Create an invoice with issue_date and due_date in past, status = 'sent'
    const pastDueInv = await invoiceService.createInvoice({
      clientId: clientA_id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-08-01',
      dueDate: '2026-08-15',
      items: [{ id: '1', description: 'Past Due Work', quantity: 1, rate: 200, amount: 0 }],
      status: 'sent',
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
    });
    const fetchedPastDue = await invoiceService.getInvoiceById(pastDueInv.id);
    assert(fetchedPastDue?.status === 'overdue', '30. Sent invoice with past due date automatically returned as overdue by backend');

    // 31. Financial tampering protection:
    // Create an invoice passing bogus totals; verify backend recalculates authoritative totals
    const tamperTestInv = await invoiceService.createInvoice({
      clientId: clientA_id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-09-01',
      items: [{ id: '1', description: 'Item', quantity: 10, rate: 10, amount: 999999 }], // amount faked
      subtotal: 1, // faked
      totalAmount: 1, // faked
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
      status: 'draft',
    });
    assert(
      tamperTestInv.subtotal === 100 && tamperTestInv.totalAmount === 118,
      '31. Financial tampering ignored: backend calculates subtotal=100 and total=118'
    );
    await invoiceService.deleteInvoice(tamperTestInv.id);

    // 32. Unauthenticated request throws 401
    removeAuthToken();
    try {
      await invoiceService.getInvoices();
      assert(false, '32. Unauthenticated request should throw 401');
    } catch (err: any) {
      assert(err instanceof ApiError && err.status === 401, '32. Unauthenticated request rejected with HTTP 401');
    }

    // 24. Tenant isolation: Register User B
    setAuthToken('');
    authService.clearUserCache();
    await authService.signup({ name: 'Invoice User B', email: userB_email, password });
    const userB = await authService.getCurrentUser();
    assert(Boolean(userB) && userB?.email === userB_email, '24a. Authenticated as User B');

    // User B lists invoices -> 0 invoices visible
    const userB_invoices = await invoiceService.getInvoices();
    assert(userB_invoices.length === 0, '24b. User B cannot see User A\'s invoices in list');

    // User B gets User A's invoice by ID -> returns null (404)
    const userB_crossGet = await invoiceService.getInvoiceById(draftInvoice_id);
    assert(userB_crossGet === null, '24c. User B cannot view User A\'s invoice (returns 404/null)');

    // User B attempts to delete User A's invoice -> throws 404
    try {
      await invoiceService.deleteInvoice(draftInvoice_id);
      assert(false, '24d. User B deleting User A\'s invoice should throw 404');
    } catch (err: any) {
      assert(err instanceof ApiError && err.status === 404, '24d. User B deleting User A\'s invoice rejected with 404 Not Found');
    }

  } finally {
    console.log('--- Cleaning up test artifacts ---');
    try {
      // Re-authenticate as User A to clean up draft invoice
      if (userA_token) {
        setAuthToken(userA_token);
        if (draftInvoice_id) {
          await invoiceService.deleteInvoice(draftInvoice_id).catch(() => {});
        }
      }
      removeAuthToken();
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }

  // Summary
  console.log(`\n========================================`);
  console.log(`Stage 8C Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`========================================\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runInvoiceIntegrationTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
