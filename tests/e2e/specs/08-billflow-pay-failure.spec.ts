import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe } from '../helpers/navigation';
import { discoverRealInvoice } from '../helpers/dynamic-discovery';

test.describe('08 - BillFlow Pay Simulated Failure Handling', () => {
  test('Demo card ending in 0002 simulates failure state gracefully', async ({ page }) => {
    const invoice = await discoverRealInvoice();
    if (!invoice || !invoice.token) {
      test.skip(true, 'SKIPPED — no existing public invoice available for checkout failure simulation');
      return;
    }

    const monitor = attachConsoleMonitor(page);
    await gotoSafe(page, `/public/invoice/${invoice.token}`);

    const payBtn = page.locator('button:has-text("Pay Now"), button:has-text("Pay")').first();
    if (!(await payBtn.isVisible())) {
      test.skip(true, 'Invoice is already settled; Pay Now dialog not available');
      return;
    }

    await payBtn.click();
    await page.waitForTimeout(500);

    // Select Card tab
    const cardTab = page.locator('button:has-text("Card")');
    if (await cardTab.isVisible()) {
      await cardTab.click();

      // Enter card ending in 0002 (simulated test failure card)
      const cardInput = page.locator('input[placeholder*="4242"], input[name*="card" i]').first();
      if (await cardInput.isVisible()) {
        await cardInput.fill('4242 4242 4242 0002');

        const submitPay = page.locator('button:has-text("Pay ₹"), button:has-text("Complete Demo Payment")').first();
        if (await submitPay.isVisible()) {
          await submitPay.click();
          await page.waitForTimeout(1500);

          // Verify failure state / retry UI
          const failureIndicator = page.locator('text=/Payment Failed|declined|Retry|failed/i').first();
          await expect(failureIndicator).toBeVisible({ timeout: 5000 });
        }
      }
    }

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });
});
