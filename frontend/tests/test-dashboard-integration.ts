/**
 * Automated Verification Script for Stage 8E Dashboard & Analytics Integration.
 * Validates dashboardService, server-side aggregations, KPIs (earned, outstanding, overdue),
 * dynamic overdue derivation, recent invoices, continuous monthly timeline, zero-income handling,
 * and tenant isolation against live FastAPI backend.
 */

import { apiClient, ApiError } from '../src/lib/api-client';
import { setAuthToken, removeAuthToken } from '../src/lib/auth-token';
import { authService } from '../src/lib/services/authService';
import { clientService } from '../src/lib/services/clientService';
import { invoiceService } from '../src/lib/services/invoiceService';
import { dashboardService } from '../src/lib/services/dashboardService';

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
  location: { pathname: '/dashboard', href: '/dashboard' },
};

async function runDashboardIntegrationTests() {
  console.log('--- Starting Stage 8E Dashboard Integration Verification ---');
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
  const userA_email = `dash_user_a_${timestamp}@example.com`;
  const userB_email = `dash_user_b_${timestamp}@example.com`;
  const password = 'Password123!';

  let userA_token = '';
  let clientA_id = '';
  let invoiceA_id = '';
  let invoiceB_id = '';
  let invoiceC_id = '';

  try {
    // 1. Authenticate as User A
    await authService.signup({ name: 'Alex Johnson', email: userA_email, password });
    userA_token = (globalThis as any).localStorage.getItem('billflow_access_token') || '';
    assert(Boolean(userA_token), '1. Authenticated as User A');

    // 2. New user gets zero/empty dashboard stats
    const emptyStats = await dashboardService.getDashboardStats();
    assert(emptyStats.totalEarned === 0, '2a. New user totalEarned is 0');
    assert(emptyStats.totalOutstanding === 0, '2b. New user totalOutstanding is 0');
    assert(emptyStats.totalOverdue === 0, '2c. New user totalOverdue is 0');
    assert(emptyStats.totalInvoicesCount === 0, '2d. New user totalInvoicesCount is 0');
    assert(emptyStats.overdueInvoicesCount === 0, '2e. New user overdueInvoicesCount is 0');
    assert(emptyStats.pendingInvoicesCount === 0, '2f. New user pendingInvoicesCount is 0');
    assert(emptyStats.recentInvoices.length === 0, '2g. New user recentInvoices is empty array');
    assert(emptyStats.currency === 'INR', '2h. Default currency matches settings');

    // 13 & 14. Monthly income timeline preserved with zeros
    assert(emptyStats.monthlyIncome.length === 6, '13. Continuous 6-month timeline returned by default');
    const allZeros = emptyStats.monthlyIncome.every((pt) => pt.amount === 0);
    assert(allZeros, '14. Zero-income months correctly preserved in timeline without removal');

    // Setup controlled test data:
    // Create a test client
    const client = await clientService.createClient({
      name: 'Northstar Media',
      email: 'finance@northstarmedia.com',
      company: 'Northstar Media Inc',
    });
    clientA_id = client.id;
    assert(Boolean(clientA_id), 'Setup: Created test client for User A');

    // Invoice A: total = 100, status = paid
    const invA = await invoiceService.createInvoice({
      clientId: clientA_id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-09-01',
      dueDate: '2026-09-15',
      items: [{ id: '1', description: 'Web Audit', quantity: 1, rate: 100, amount: 0 }],
      taxPercentage: 0,
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
      status: 'draft',
    });
    invoiceA_id = invA.id;
    // Transition draft -> sent -> paid
    await invoiceService.updateInvoice(invoiceA_id, { status: 'sent' });
    await invoiceService.updateInvoice(invoiceA_id, { status: 'paid' });

    // Invoice B: total = 200, status = sent, future due date (e.g. 2026-10-15)
    const invB = await invoiceService.createInvoice({
      clientId: clientA_id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-09-01',
      dueDate: '2026-10-15',
      items: [{ id: '1', description: 'Design Sprint', quantity: 1, rate: 200, amount: 0 }],
      taxPercentage: 0,
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
      status: 'draft',
    });
    invoiceB_id = invB.id;
    await invoiceService.updateInvoice(invoiceB_id, { status: 'sent' });

    // Invoice C: total = 300, status = overdue (sent with past due date 2026-08-15)
    const invC = await invoiceService.createInvoice({
      clientId: clientA_id,
      clientName: client.name,
      clientEmail: client.email,
      issueDate: '2026-08-01',
      dueDate: '2026-08-15',
      items: [{ id: '1', description: 'Past Consulting', quantity: 1, rate: 300, amount: 0 }],
      taxPercentage: 0,
      status: 'sent',
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'INR',
    });
    invoiceC_id = invC.id;

    // Fetch dashboard stats for User A
    const activeStats = await dashboardService.getDashboardStats();

    // 4. totalEarned
    assert(activeStats.totalEarned === 100, `4. Authoritative totalEarned: ${activeStats.totalEarned} === 100`);

    // 5. totalOutstanding: 200 (pending sent) + 300 (overdue) = 500
    assert(activeStats.totalOutstanding === 500, `5. Authoritative totalOutstanding: ${activeStats.totalOutstanding} === 500`);

    // 6. totalOverdue: 300
    assert(activeStats.totalOverdue === 300, `6. Authoritative totalOverdue: ${activeStats.totalOverdue} === 300`);

    // 7. totalInvoicesCount: 3
    assert(activeStats.totalInvoicesCount === 3, `7. Authoritative totalInvoicesCount: ${activeStats.totalInvoicesCount} === 3`);

    // 8. overdueInvoicesCount: 1
    assert(activeStats.overdueInvoicesCount === 1, `8. Authoritative overdueInvoicesCount: ${activeStats.overdueInvoicesCount} === 1`);

    // 9. pendingInvoicesCount: 1
    assert(activeStats.pendingInvoicesCount === 1, `9. Authoritative pendingInvoicesCount: ${activeStats.pendingInvoicesCount} === 1`);

    // 10. currency
    assert(activeStats.currency === 'INR', `10. Correct currency code: ${activeStats.currency}`);

    // 11. recentInvoices
    assert(
      activeStats.recentInvoices.length === 3 &&
      activeStats.recentInvoices[0].clientName === 'Northstar Media',
      '11. recentInvoices returns correctly structured array directly from backend'
    );

    // 12. Monthly income updated with paid revenue
    const currentMonthPoint = activeStats.monthlyIncome[activeStats.monthlyIncome.length - 1];
    assert(
      currentMonthPoint.amount === 100,
      `12. Monthly income reflects collected payment in current cycle: ${currentMonthPoint.amount} === 100`
    );

    // 15. Query parameter test: months = 12
    const stats12Months = await dashboardService.getDashboardStats(12);
    assert(
      stats12Months.monthlyIncome.length === 12,
      '15. months=12 parameter returns unbroken 12-month historical timeline'
    );

    // 16. Tenant isolation: Register and Login User B
    setAuthToken('');
    authService.clearUserCache();
    await authService.signup({ name: 'User B', email: userB_email, password });
    const userB_stats = await dashboardService.getDashboardStats();
    assert(
      userB_stats.totalEarned === 0 &&
      userB_stats.totalOutstanding === 0 &&
      userB_stats.totalOverdue === 0 &&
      userB_stats.totalInvoicesCount === 0 &&
      userB_stats.recentInvoices.length === 0,
      '16. Tenant isolation: User B dashboard contains zero User A earnings, invoices, or recent records'
    );

    // 17. Unauthenticated request throws 401
    removeAuthToken();
    try {
      await dashboardService.getDashboardStats();
      assert(false, '17. Unauthenticated dashboard request should throw 401');
    } catch (err: any) {
      assert(err instanceof ApiError && err.status === 401, '17. Unauthenticated dashboard request rejected with 401');
    }

    // 18. Network / API error handling
    try {
      await apiClient.get('/dashboard/invalid-route');
      assert(false, '18. Invalid route should throw ApiError');
    } catch (err: any) {
      assert(err instanceof ApiError, '18. Invalid endpoint surfaces as typed ApiError cleanly');
    }

  } finally {
    console.log('--- Cleaning up test artifacts ---');
    try {
      removeAuthToken();
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }

  // Summary
  console.log(`\n========================================`);
  console.log(`Stage 8E Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`========================================\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runDashboardIntegrationTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
