import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe } from '../helpers/navigation';

test.describe('01 - Landing Page and Global Navigation', () => {
  test('Landing page renders hero, branding, navigation, and SEO tags', async ({ page }) => {
    const monitor = attachConsoleMonitor(page);

    await gotoSafe(page, '/');

    // Branding & Header
    await expect(page).toHaveTitle(/BillFlow/i);
    const logo = page.locator('text=BillFlow').first();
    await expect(logo).toBeVisible();

    // Key sections
    const getStartedBtn = page.locator('a:has-text("Get Started"), button:has-text("Get Started")').first();
    await expect(getStartedBtn).toBeVisible();

    const loginLink = page.locator('a[href="/login"], a:has-text("Sign in"), a:has-text("Login")').first();
    await expect(loginLink).toBeVisible();

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });

  test('Navigation to /login and /signup renders valid auth entry points', async ({ page }) => {
    const monitor = attachConsoleMonitor(page);

    await gotoSafe(page, '/login');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    await gotoSafe(page, '/signup');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();

    monitor.assertNoCriticalErrors();
    monitor.detach();
  });
});
