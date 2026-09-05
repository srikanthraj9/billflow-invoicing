import { Page, expect } from '@playwright/test';

export const VIEWPORTS = {
  desktopLarge: { width: 1440, height: 900 },
  desktopStandard: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

/**
 * Safely navigates to URL and waits for network idle or domcontentloaded.
 */
export async function gotoSafe(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
}

/**
 * Helper to check if page is redirected to login when unauthenticated.
 */
export async function assertProtectedRedirect(page: Page, protectedPath: string): Promise<void> {
  await page.goto(protectedPath, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForURL((url) => url.pathname.includes('/login') || url.pathname === '/', { timeout: 3500 });
  } catch {
    // URL didn't transition in time, check current state below
  }
  const currentUrl = page.url();
  const hasLoginField = (await page.locator('input[type="password"]').count()) > 0;
  const isRedirectedToLogin =
    currentUrl.includes('/login') ||
    currentUrl === 'http://localhost:3000/' ||
    currentUrl.includes('?redirect=') ||
    hasLoginField;
  expect(
    isRedirectedToLogin,
    `Unauthenticated access to ${protectedPath} should redirect to login or landing. Current URL: ${currentUrl}`
  ).toBe(true);
}
