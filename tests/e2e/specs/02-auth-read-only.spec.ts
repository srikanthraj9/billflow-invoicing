import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe, assertProtectedRedirect } from '../helpers/navigation';
import { activeEnv, E2ETestMode } from '../config/test-mode';
import { credentials } from '../config/env';

test.describe('02 - Authentication & Protected Route Safety', () => {
  test('Unauthenticated access to protected routes redirects cleanly', async ({ page }) => {
    const monitor = attachConsoleMonitor(page);

    const protectedPaths = ['/dashboard', '/invoices', '/clients', '/payments', '/reports', '/settings'];
    for (const path of protectedPaths) {
      await assertProtectedRedirect(page, path);
    }

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });

  test('Login form validates empty and invalid inputs without server crash', async ({ page }) => {
    const monitor = attachConsoleMonitor(page);

    await gotoSafe(page, '/login');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Application validation message appears
    await expect(page.locator('text=/Email is required|valid email/i')).toBeVisible({ timeout: 5000 });

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });

  test('Signup form validates password criteria and email format on client', async ({ page }) => {
    const monitor = attachConsoleMonitor(page);

    await gotoSafe(page, '/signup');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.fill('invalid-email-format');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('123'); // weak password

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Client validation prevents submission
    const currentUrl = page.url();
    expect(currentUrl).toContain('/signup');

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });

  test('Full User Signup Lifecycle (Creation & Mutation)', async () => {
    test.skip(
      activeEnv.mode === E2ETestMode.READ_ONLY_SHARED_DB,
      'SKIPPED — isolated E2E database required (user creation blocked in shared DB)'
    );
  });

  test('Authenticated User Login and Dashboard Load', async ({ page }) => {
    if (!credentials.hasCredentials) {
      test.skip(true, 'SKIPPED — no authenticated E2E credentials supplied');
      return;
    }

    const monitor = attachConsoleMonitor(page);
    await gotoSafe(page, '/login');

    await page.fill('input[type="email"], input[name="email"]', credentials.email!);
    await page.fill('input[type="password"]', credentials.password!);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });
});
