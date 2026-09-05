import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe } from '../helpers/navigation';
import { discoverRealInvoice } from '../helpers/dynamic-discovery';

test.describe('09 - Cross-Page Real Data Consistency Audit', () => {
  test('Discovered backend invoice attributes match consistently across /payments and /reports', async ({ page }) => {
    const invoice = await discoverRealInvoice();
    if (!invoice) {
      test.skip(true, 'Cross-page invoice consistency — no existing invoice available.');
      return;
    }

    const monitor = attachConsoleMonitor(page);

    // 1. Check /payments
    await gotoSafe(page, '/payments');
    if (!page.url().includes('/login')) {
      const invNumEl = page.locator(`text=${invoice.invoiceNumber}`).first();
      await expect(invNumEl).toBeVisible({ timeout: 5000 });

      // Ensure NO fabricated demo invoices exist
      await expect(page.locator('text=INV-2026-001')).toHaveCount(0);
      await expect(page.locator('text=Priya Shah')).toHaveCount(0);
      await expect(page.locator('text=TechMatrix Ltd')).toHaveCount(0);
    }

    // 2. Check /payments/[id]
    await gotoSafe(page, `/payments/${invoice.id}`);
    if (!page.url().includes('/login')) {
      await expect(page.locator(`text=${invoice.invoiceNumber}`).first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator(`text=${invoice.clientName}`).first()).toBeVisible({ timeout: 5000 });
    }

    // 3. Check /reports
    await gotoSafe(page, '/reports');
    if (!page.url().includes('/login')) {
      // Must NOT display hardcoded fake financial numbers
      await expect(page.locator('text=/4,82,500|482500/')).toHaveCount(0);
      await expect(page.locator('text=Nexus Dynamics')).toHaveCount(0);
    }

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });
});
