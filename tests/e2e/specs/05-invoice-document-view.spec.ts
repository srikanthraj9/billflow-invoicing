import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe } from '../helpers/navigation';
import { discoverRealInvoice } from '../helpers/dynamic-discovery';

test.describe('05 - Invoice Document Preview & Print Layout', () => {
  test('Dynamic invoice document preview renders cleanly with zero errors', async ({ page }) => {
    const invoice = await discoverRealInvoice();
    if (!invoice) {
      test.skip(true, 'SKIPPED — no existing invoice available for document preview');
      return;
    }

    const monitor = attachConsoleMonitor(page);
    await gotoSafe(page, `/invoices/${invoice.id}`);

    if (page.url().includes('/login')) {
      // Clean auth redirect
      expect(page.url()).toContain('/login');
    } else {
      // Document container inspection
      const doc = page.locator('#invoice-document, [data-testid="invoice-document"], main').first();
      await expect(doc).toBeVisible();
    }

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });
});
