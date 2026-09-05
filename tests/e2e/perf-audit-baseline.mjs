import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { existsSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find playwright in npm-cache
let playwrightPath = '';
const cacheDir = join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
if (existsSync(cacheDir)) {
  for (const d of readdirSync(cacheDir)) {
    const candidate = join(cacheDir, d, 'node_modules', 'playwright');
    if (existsSync(candidate)) {
      playwrightPath = candidate;
      break;
    }
  }
}

const importTarget = playwrightPath ? pathToFileURL(join(playwrightPath, 'index.mjs')).href : 'playwright';
const { chromium } = await import(importTarget);

async function runPerfAudit() {
  console.log('===============================================================');
  console.log('            BILLFLOW APPLICATION PERFORMANCE AUDIT');
  console.log('===============================================================');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Authenticate if test credentials exist
  const email = process.env.E2E_TEST_EMAIL || 'demo@billflow.app';
  const password = process.env.E2E_TEST_PASSWORD || 'Demo1234!';
  
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  const fillDemoBtn = page.locator('button:has-text("Fill Demo")');
  if ((await fillDemoBtn.count()) > 0) {
    await fillDemoBtn.click();
  } else {
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
  }
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(1000);
  const currentStoredToken = await page.evaluate(() => localStorage.getItem('billflow_access_token'));
  console.log('CURRENT STORED TOKEN PRESENT:', Boolean(currentStoredToken));

  page.on('response', (res) => {
    if (res.status() >= 400 && res.url().includes('/api/')) {
      console.log(`[API ${res.status()}] ${res.url()} | Auth: ${Boolean(res.request().headers()['authorization'])}`);
    }
  });

  const routes = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Invoices', path: '/invoices' },
    { name: 'Clients', path: '/clients' },
    { name: 'Payments', path: '/payments' },
    { name: 'Reports', path: '/reports' },
    { name: 'Settings', path: '/settings' },
  ];

  console.log('\n===============================================================');
  console.log('       COLD NAVIGATION AUDIT (Fresh Page / Cold Reload)');
  console.log('===============================================================\n');

  for (const route of routes) {
    const requests = [];
    const consoleErrors = [];

    const requestListener = (req) => {
      const url = req.url();
      if (url.includes('/api/')) {
        const method = req.method();
        const endpoint = url.split('/api')[1] || url;
        requests.push({ method, endpoint: endpoint.split('?')[0], fullUrl: url });
      }
    };

    const consoleListener = (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    };

    page.on('request', requestListener);
    page.on('console', consoleListener);

    const startTime = Date.now();
    try {
      await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
    } catch {
      // Handled graceful transition/redirect
    }
    const navTime = Date.now() - startTime;

    page.off('request', requestListener);
    page.off('console', consoleListener);

    // Count duplicates
    const counts = {};
    for (const r of requests) {
      const key = `${r.method} ${r.endpoint}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    const duplicates = Object.entries(counts).filter(([_, count]) => count > 1);
    const totalDuplicates = duplicates.reduce((sum, [_, count]) => sum + (count - 1), 0);

    console.log(`Route: ${route.name} (${route.path})`);
    console.log(`  Navigation Time:   ${navTime}ms`);
    console.log(`  Total API Requests: ${requests.length}`);
    console.log(`  Duplicate Requests: ${totalDuplicates}`);
    console.log(`  Requests list:     ${requests.map(r => `${r.method} ${r.endpoint}`).join(', ') || 'None'}`);
    if (duplicates.length > 0) {
      console.log(`  Duplicated Endpoints:`);
      for (const [ep, c] of duplicates) {
        console.log(`    - ${ep}: called ${c} times`);
      }
    }
    if (consoleErrors.length > 0) {
      console.log(`  Console Errors:     ${consoleErrors.length}`);
      for (const err of consoleErrors) {
        console.log(`    ! ${err}`);
      }
    }
    console.log('---------------------------------------------------------------');
  }

  console.log('\n===============================================================');
  console.log('     WARM NAVIGATION AUDIT (Client-side Link Navigation)');
  console.log('===============================================================\n');

  for (const route of routes) {
    const requests = [];
    const consoleErrors = [];

    const requestListener = (req) => {
      const url = req.url();
      if (url.includes('/api/')) {
        const method = req.method();
        const endpoint = url.split('/api')[1] || url;
        requests.push({ method, endpoint: endpoint.split('?')[0], fullUrl: url });
      }
    };

    const consoleListener = (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    };

    page.on('request', requestListener);
    page.on('console', consoleListener);

    const startTime = Date.now();
    try {
      // Find sidebar link and click it for single-click client navigation
      const navLink = page.locator(`aside nav a[href="${route.path}"]`);
      if (await navLink.count() > 0) {
        await navLink.click();
      } else {
        await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'domcontentloaded' });
      }
      await page.waitForTimeout(800);
    } catch {
      // Handled
    }
    const navTime = Date.now() - startTime;

    page.off('request', requestListener);
    page.off('console', consoleListener);

    // Count duplicates
    const counts = {};
    for (const r of requests) {
      const key = `${r.method} ${r.endpoint}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    const duplicates = Object.entries(counts).filter(([_, count]) => count > 1);
    const totalDuplicates = duplicates.reduce((sum, [_, count]) => sum + (count - 1), 0);

    console.log(`Route: ${route.name} (${route.path})`);
    console.log(`  Navigation Time:   ${navTime}ms`);
    console.log(`  Total API Requests: ${requests.length}`);
    console.log(`  Duplicate Requests: ${totalDuplicates}`);
    console.log(`  Requests list:     ${requests.map(r => `${r.method} ${r.endpoint}`).join(', ') || 'None'}`);
    if (duplicates.length > 0) {
      console.log(`  Duplicated Endpoints:`);
      for (const [ep, c] of duplicates) {
        console.log(`    - ${ep}: called ${c} times`);
      }
    }
    if (consoleErrors.length > 0) {
      console.log(`  Console Errors:     ${consoleErrors.length}`);
      for (const err of consoleErrors) {
        console.log(`    ! ${err}`);
      }
    }
    console.log('---------------------------------------------------------------');
  }

  await browser.close();
}

runPerfAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
