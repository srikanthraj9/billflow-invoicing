import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe } from '../helpers/navigation';

test.describe('13 - Security & Secrets Leakage Prevention', () => {
  test('Rendered DOM and client-side assets do NOT expose server secrets or private credentials', async ({ page }) => {
    const monitor = attachConsoleMonitor(page);

    await gotoSafe(page, '/');
    const content = await page.content();

    // Verify service-role keys or sensitive backend secrets are not leaked in HTML
    expect(content.includes('service_role')).toBe(false);
    expect(content.includes('JWT_SECRET_KEY')).toBe(false);
    expect(content.includes('M5sFljdlwKcv0uqr')).toBe(false); // DB password check
    expect(content.includes('sb_secret_')).toBe(false);

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });
});
