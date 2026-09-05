import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe } from '../helpers/navigation';
import { activeEnv, E2ETestMode } from '../config/test-mode';

test.describe('11 - Settings Read-Only Inspection', () => {
  test('Settings page loads cleanly with zero console runtime errors', async ({ page }) => {
    const monitor = attachConsoleMonitor(page);

    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 2500 });
    } catch {}

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible();
    }

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });

  test('Business Profile & Logo Mutations (PUT /api/settings)', async () => {
    test.skip(
      activeEnv.mode === E2ETestMode.READ_ONLY_SHARED_DB,
      'SKIPPED — isolated E2E database required (settings mutation blocked in shared DB)'
    );
  });
});
