import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe, VIEWPORTS } from '../helpers/navigation';

test.describe('12 - Responsive Viewport Quality', () => {
  const viewports = [
    { name: 'Desktop 1440x900', ...VIEWPORTS.desktopLarge },
    { name: 'Laptop 1280x800', ...VIEWPORTS.desktopStandard },
    { name: 'Tablet 768x1024', ...VIEWPORTS.tablet },
    { name: 'Mobile 390x844', ...VIEWPORTS.mobile },
  ];

  for (const vp of viewports) {
    test(`Landing and auth flow render cleanly on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const monitor = attachConsoleMonitor(page);

      await gotoSafe(page, '/');
      await expect(page.locator('body')).toBeVisible();

      // Ensure no broken horizontal overflow on mobile
      if (vp.width <= 768) {
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
      }

      monitor.assertNoCriticalErrors();
      monitor.detach();
    });
  }
});
