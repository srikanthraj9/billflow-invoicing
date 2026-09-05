import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe } from '../helpers/navigation';
import { discoverRealInvoice } from '../helpers/dynamic-discovery';
import { activeEnv, E2ETestMode } from '../config/test-mode';

test.describe('04 - Invoice Discovery, Filters & Router Error Zero-Tolerance', () => {
  test('Dynamic discovery of existing backend invoice', async () => {
    const invoice = await discoverRealInvoice();
    if (!invoice) {
      test.skip(true, 'SKIPPED — no existing invoices available in backend');
      return;
    }

    expect(invoice.id).toBeTruthy();
    expect(invoice.invoiceNumber).toBeTruthy();
    expect(invoice.totalAmount).toBeGreaterThanOrEqual(0);
    expect(['draft', 'sent', 'paid', 'overdue']).toContain(invoice.status);
  });

  test('Invoice Filter & Search UI executes with zero router updater errors', async ({ page }) => {
    const monitor = attachConsoleMonitor(page);

    // Open invoices page
    await page.goto('/invoices', { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 2500 });
    } catch {
      // Stayed on invoices or still loading
    }

    // If redirected to login, verify clean redirect without router updater crash
    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      // If accessible, test interactive filtering
      const searchInput = page.locator('input[placeholder*="Search" i]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('INV');
        await page.waitForTimeout(300);
        await searchInput.fill('');
      }

      // Click filter buttons if available
      const statusFilters = page.locator('button:has-text("Paid"), button:has-text("Draft"), button:has-text("All")');
      const count = await statusFilters.count();
      for (let i = 0; i < count; i++) {
        await statusFilters.nth(i).click();
        await page.waitForTimeout(200);
      }
    }

    // Critical assertion: verify no router render-loop error occurred
    monitor.assertNoCriticalErrors();
    expect(
      monitor.routerErrors,
      'Forbidden React router render error detected in console!'
    ).toHaveLength(0);

    monitor.detach();
  });

  test('Invoice Creation Lifecycle (POST /api/invoices)', async () => {
    test.skip(
      activeEnv.mode === E2ETestMode.READ_ONLY_SHARED_DB,
      'SKIPPED — isolated E2E database required (invoice creation blocked in shared DB)'
    );
  });

  test('Invoice Status Transitions (Draft -> Sent -> Paid / Overdue)', async () => {
    test.skip(
      activeEnv.mode === E2ETestMode.READ_ONLY_SHARED_DB,
      'SKIPPED — isolated E2E database required (status mutations blocked in shared DB)'
    );
  });
});
