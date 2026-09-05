import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe } from '../helpers/navigation';
import { discoverRealInvoice } from '../helpers/dynamic-discovery';

test.describe('06 - Public Invoice Portal (Unauthenticated)', () => {
  test('Invalid public token displays user-friendly not-found error without crash', async ({ page }) => {
    const monitor = attachConsoleMonitor(page);

    await gotoSafe(page, '/public/invoice/e2e-nonexistent-token-12345');

    // Page must render an error/not-found UI without crashing into a blank screen
    const errorHeading = page.getByRole('heading', { name: /invalid|not found/i });
    await expect(errorHeading).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Return to BillFlow')).toBeVisible();

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });

  test('Existing public invoice renders authoritative details without internal secrets', async ({ page }) => {
    const invoice = await discoverRealInvoice();
    if (!invoice || !invoice.token) {
      test.skip(true, 'SKIPPED — no existing public invoice available with public token');
      return;
    }

    const monitor = attachConsoleMonitor(page);
    await gotoSafe(page, `/public/invoice/${invoice.token}`);

    // Authoritative information displayed
    await expect(page.locator(`text=${invoice.invoiceNumber}`)).toBeVisible();

    // Verify private dashboard sidebar is NOT present on public page
    const sidebar = page.locator('aside, nav:has-text("Dashboard")');
    await expect(sidebar).toHaveCount(0);

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });

  test('Paid public invoice displays Payment Completed card, hides Pay button, and persists after refresh', async ({ page }) => {
    const invoice = await discoverRealInvoice();
    if (!invoice || !invoice.token) {
      test.skip(true, 'SKIPPED — no existing public invoice available with public token');
      return;
    }

    const monitor = attachConsoleMonitor(page);

    // Pre-populate mockPaymentService demo payment in localStorage for this real invoice
    await page.addInitScript((inv) => {
      const existing = localStorage.getItem('billflow_demo_payments');
      const list = existing ? JSON.parse(existing) : [];
      const payment = {
        id: `BF-DEMO-TEST-${inv.invoiceNumber}`,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        token: inv.token,
        amount: inv.totalAmount,
        currency: 'INR',
        customerName: inv.clientName,
        paymentMethod: 'UPI',
        status: 'Paid',
        date: '2026-09-05',
        paidAt: '2026-09-05T11:20:00.000Z',
        referenceId: 'BF-DEMO-999999',
        isSimulated: true,
      };
      localStorage.setItem('billflow_demo_payments', JSON.stringify([payment, ...list]));
    }, invoice);

    await gotoSafe(page, `/public/invoice/${invoice.token}`);

    // 1. Verify Payment Completed card is rendered
    const completedHeading = page.locator('text=/Payment Completed/i').first();
    await expect(completedHeading).toBeVisible({ timeout: 5000 });

    // 2. Verify You Paid amount is displayed
    await expect(page.locator('text=/You Paid/i')).toBeVisible();

    // 3. Verify Payment method and reference are shown
    await expect(page.locator('text=BF-DEMO-999999')).toBeVisible();

    // 4. Verify "Pay ₹..." button is completely absent
    const payBtn = page.locator('button:has-text("Pay ₹"), button:has-text("Pay Now")');
    await expect(payBtn).toHaveCount(0);

    // 5. Verify "View Receipt" button is present and opens authoritative receipt modal
    const viewReceiptBtn = page.locator('button:has-text("View Receipt")').first();
    await expect(viewReceiptBtn).toBeVisible();
    await viewReceiptBtn.click();

    // Receipt modal must display authoritative details and demo disclaimer
    await expect(page.locator('text=/DEMO \\/ SIMULATED PAYMENT/i')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=/NO REAL MONEY TRANSFERRED/i')).toBeVisible();

    // Close receipt modal
    const closeBtn = page.locator('button:has-text("Close")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }

    // 6. Test Refresh Persistence: reload the page and verify state remains PAID
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await expect(page.locator('text=/Payment Completed/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Pay ₹"), button:has-text("Pay Now")')).toHaveCount(0);
    await expect(page.locator('text=BF-DEMO-999999')).toBeVisible();

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });
});
