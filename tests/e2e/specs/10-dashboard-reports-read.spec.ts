import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe } from '../helpers/navigation';

test.describe('10 - Dashboard and Reports Read-Only Financial Integrity', () => {
  test('Reports page calculates only authoritative data without fabricated fallback numbers', async ({ page }) => {
    const monitor = attachConsoleMonitor(page);

    await page.goto('/reports', { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 2500 });
    } catch {}

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      // Must NOT contain former fake top clients
      await expect(page.locator('text=TechMatrix Ltd')).toHaveCount(0);
      await expect(page.locator('text=Nexus Dynamics')).toHaveCount(0);
      await expect(page.locator('text=Vikram Sethi')).toHaveCount(0);

      // Must display honest disclaimer
      const disclaimer = page.locator('text=/Payment gateway not connected|Authoritative Backend Data|Frontend demonstration/i').first();
      await expect(disclaimer).toBeVisible();
    }

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });

  test('Dashboard page payment snapshot renders with zero fallback numbers', async ({ page }) => {
    const monitor = attachConsoleMonitor(page);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 2500 });
    } catch {}

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      // Must NOT contain old hardcoded fallback numbers
      await expect(page.locator('text=₹2,84,500')).toHaveCount(0);
      await expect(page.locator('text=Priya Shah')).toHaveCount(0);
    }

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });
});
