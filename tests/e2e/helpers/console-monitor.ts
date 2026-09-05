import { Page, expect } from '@playwright/test';

export interface ConsoleMonitor {
  errors: string[];
  warnings: string[];
  routerErrors: string[];
  detach: () => void;
  assertNoCriticalErrors: () => void;
}

export function attachConsoleMonitor(page: Page): ConsoleMonitor {
  const errors: string[] = [];
  const warnings: string[] = [];
  const routerErrors: string[] = [];

  const consoleHandler = (msg: any) => {
    const text = msg.text();
    const type = msg.type();

    if (text.includes('Cannot update a component') || text.includes('while rendering a different component')) {
      routerErrors.push(text);
      errors.push(`[ROUTER_RENDER_ERROR] ${text}`);
    } else if (type === 'error') {
      // Ignore known benign network telemetry or favicon 404s
      if (!text.includes('favicon.ico') && !text.includes('404 (Not Found)')) {
        errors.push(text);
      }
    } else if (type === 'warning') {
      warnings.push(text);
    }
  };

  const pageErrorHandler = (err: Error) => {
    errors.push(`[PAGE_ERROR] ${err.message}`);
    if (err.message.includes('Cannot update a component') || err.message.includes('Router')) {
      routerErrors.push(err.message);
    }
  };

  page.on('console', consoleHandler);
  page.on('pageerror', pageErrorHandler);

  return {
    errors,
    warnings,
    routerErrors,
    detach: () => {
      page.off('console', consoleHandler);
      page.off('pageerror', pageErrorHandler);
    },
    assertNoCriticalErrors: () => {
      // 1. Strict assertion against React router updater error
      expect(
        routerErrors,
        `Detected forbidden React router updater error: ${routerErrors.join('\n')}`
      ).toHaveLength(0);

      // 2. Strict assertion against unhandled React runtime errors
      const criticalErrors = errors.filter(
        (e) =>
          e.includes('Minified React error') ||
          e.includes('Unhandled Runtime Error') ||
          e.includes('ChunkLoadError') ||
          e.includes('Hydration failed')
      );
      expect(
        criticalErrors,
        `Detected critical React runtime errors: ${criticalErrors.join('\n')}`
      ).toHaveLength(0);
    },
  };
}
