/**
 * BillFlow E2E Orchestrator & QA Matrix Generator
 * Enforces READ_ONLY_SHARED_DB mode safety and outputs categorized results.
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// 1. Detect Mode Safely
const frontendUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
const hasCredentials = Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);
const e2eDbUrl = process.env.E2E_DATABASE_URL || '';
const isSharedDb =
  !e2eDbUrl ||
  e2eDbUrl.includes('supabase.co') ||
  e2eDbUrl.includes('pooler.supabase.com') ||
  e2eDbUrl.includes('jtnsakufuckvhwoluntr');

const hasIsolatedDb = Boolean(e2eDbUrl) && !isSharedDb;
const mode = hasIsolatedDb ? 'FULL_ISOLATED_E2E' : 'READ_ONLY_SHARED_DB';

// 2. Print Mode Banner
console.log('========================================');
console.log('       BillFlow E2E Test Mode');
console.log(`         ${mode}`);
console.log('========================================');
console.log(`Frontend URL:                  ${frontendUrl}`);
console.log(`E2E Credentials Available:     ${hasCredentials ? 'Yes' : 'No'}`);
console.log(`Isolated E2E Database:         ${hasIsolatedDb ? 'Yes' : 'No (Blocked for shared database)'}`);
if (mode === 'READ_ONLY_SHARED_DB') {
  console.log('Safety Notice:                 Read-only mode active. Database writes, test user creation,');
  console.log('                               and client/invoice mutations are strictly prohibited.');
}
console.log('========================================\n');

// 3. Execute Playwright Tests
const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';
const configPath = join(__dirname, 'playwright.config.ts');

// Find cached @playwright/test in npm-cache
let playwrightModulePath = '';
try {
  const cacheDir = join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
  if (existsSync(cacheDir)) {
    const { readdirSync } = await import('fs');
    const dirs = readdirSync(cacheDir);
    for (const d of dirs) {
      const candidate = join(cacheDir, d, 'node_modules');
      if (existsSync(join(candidate, '@playwright', 'test'))) {
        playwrightModulePath = candidate;
        break;
      }
    }
  }
} catch {
  // ignore
}

const existingNodePath = process.env.NODE_PATH || '';
const combinedNodePath = [playwrightModulePath, existingNodePath].filter(Boolean).join(isWindows ? ';' : ':');
const cliPath = join(playwrightModulePath, '@playwright', 'test', 'cli.js');

console.log('Executing E2E test suite with Playwright & Google Chrome...\n');
const startTime = Date.now();

const result = spawnSync('node', [cliPath, 'test', `--config=${configPath}`], {
  stdio: 'inherit',
  cwd: projectRoot,
  env: {
    ...process.env,
    NODE_PATH: combinedNodePath,
    E2E_TEST_MODE: mode,
  },
  shell: true,
});

const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

// 4. Parse Results
console.log('\n===============================================================');
console.log('         BILLFLOW E2E QA EXECUTION SUMMARY');
console.log('===============================================================');
console.log(`Mode:           ${mode}`);
console.log(`Duration:       ${durationSec}s`);
console.log(`Exit Code:      ${result.status}`);

const possiblePaths = [
  join(__dirname, 'test-results', 'e2e-report.json'),
  join(projectRoot, 'test-results', 'e2e-report.json'),
];
const reportPath = possiblePaths.find((p) => existsSync(p));

let passedCount = 0;
let failedCount = 0;
let skippedCount = 0;

if (reportPath && existsSync(reportPath)) {
  try {
    const reportData = JSON.parse(readFileSync(reportPath, 'utf8'));
    const suites = reportData.suites || [];

    function countSpecs(suite) {
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests || []) {
            const res = test.results?.[0];
            if (test.status === 'skipped' || res?.status === 'skipped') {
              skippedCount++;
            } else if (res?.status === 'passed') {
              passedCount++;
            } else if (res?.status === 'failed' || res?.status === 'timedOut') {
              failedCount++;
            }
          }
        }
      }
      if (suite.suites) {
        for (const s of suite.suites) countSpecs(s);
      }
    }

    for (const s of suites) countSpecs(s);
  } catch (e) {
    // fallback
  }
}

console.log('\n--- CATEGORY 1: READ-ONLY TESTS ---');
console.log(`Passed:         ${passedCount}`);
console.log(`Failed:         ${failedCount}`);

console.log('\n--- CATEGORY 2: WRITE-DEPENDENT TESTS ---');
console.log(`Skipped:        ${skippedCount} (isolated database required)`);
console.log('\nExplanation:');
console.log('"Full CRUD E2E testing was intentionally not executed against the');
console.log('shared database to prevent production data mutation."');
console.log('===============================================================\n');

if (result.status === 0) {
  process.exit(0);
} else {
  process.exit(result.status || 1);
}
