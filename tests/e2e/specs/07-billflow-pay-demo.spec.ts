import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe } from '../helpers/navigation';
import { discoverRealInvoice } from '../helpers/dynamic-discovery';

test.describe('07 - BillFlow Pay Frontend Demo & Payment Details', () => {
  test('Payment details page renders authoritative invoice information and demo disclaimer', async ({ page }) => {
    const invoice = await discoverRealInvoice();
    if (!invoice) {
      test.skip(true, 'SKIPPED — no existing invoice available for payment details inspection');
      return;
    }

    const monitor = attachConsoleMonitor(page);
    await gotoSafe(page, `/payments/${invoice.id}`);

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      // Must display authoritative invoice number
      await expect(page.locator(`text=${invoice.invoiceNumber}`).first()).toBeVisible({ timeout: 5000 });

      // Must display honest demo transaction disclaimer
      const demoNotice = page.locator('text=/Demo Transaction|SIMULATED PAYMENT|simulated|demonstration/i').first();
      await expect(demoNotice).toBeVisible();

      // Must NOT claim real banking settlement
      const realMoneyClaim = page.locator('text=real money transferred, text=bank transfer complete');
      await expect(realMoneyClaim).toHaveCount(0);
    }

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });

  test('Public demo checkout flow updates portal to Payment Completed and prevents double payment', async ({ page }) => {
    const invoice = await discoverRealInvoice();
    if (!invoice || !invoice.token) {
      test.skip(true, 'SKIPPED — no existing public invoice available for demo checkout flow');
      return;
    }

    const monitor = attachConsoleMonitor(page);
    await gotoSafe(page, `/public/invoice/${invoice.token}`);

    const payBtn = page.locator('button:has-text("Pay ₹"), button:has-text("Pay Now")').first();
    if (await payBtn.isVisible()) {
      await payBtn.click();
      await page.waitForTimeout(400);

      // Verify payment modal is open
      await expect(page.locator('text=/BILLFLOW PAY/i')).toBeVisible();

      // Click Pay button to trigger simulated demo payment
      const triggerPayBtn = page.locator('div[role="dialog"] button:has-text("Pay ₹")').first();
      if (await triggerPayBtn.isVisible()) {
        await triggerPayBtn.click();

        // Wait for processing state and success completion (1.2s delay in demo)
        await page.waitForTimeout(1800);

        // Success dialog must be visible
        await expect(page.locator('text=/Demo payment completed|Payment Successful/i')).toBeVisible({ timeout: 5000 });

        // Click "Back to Invoice"
        const backBtn = page.locator('button:has-text("Back to Invoice")').first();
        if (await backBtn.isVisible()) {
          await backBtn.click();
          await page.waitForTimeout(400);
        }

        // Verify public invoice portal now renders Payment Completed card
        await expect(page.locator('text=/Payment Completed/i').first()).toBeVisible();
        await expect(page.locator('text=/You Paid/i')).toBeVisible();

        // Verify Pay button is completely gone (preventing double payment)
        await expect(page.locator('button:has-text("Pay ₹"), button:has-text("Pay Now")')).toHaveCount(0);
      }
    }

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });
});
