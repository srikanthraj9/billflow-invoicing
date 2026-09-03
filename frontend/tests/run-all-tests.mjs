/**
 * Cross-platform test runner for all BillFlow frontend integration and QA suites.
 * Executes all 7 test suites sequentially and exits with non-zero code if any suite fails.
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const suites = [
  { name: 'Stage 8A: Auth Integration', file: 'test-auth-integration.ts' },
  { name: 'Stage 8B: Client Integration', file: 'test-client-integration.ts' },
  { name: 'Stage 8C: Invoice Integration', file: 'test-invoice-integration.ts' },
  { name: 'Stage 8D: Public Invoice Integration', file: 'test-public-invoice-integration.ts' },
  { name: 'Stage 8E: Dashboard Integration', file: 'test-dashboard-integration.ts' },
  { name: 'Stage 8F: Settings Integration', file: 'test-settings-integration.ts' },
  { name: 'Stage 8G: Full-Stack QA & Audit', file: 'test-fullstack-qa.ts' },
];

console.log('===============================================================');
console.log('--- BILLFLOW COMPREHENSIVE INTEGRATION TEST SUITE RUNNER ---');
console.log(`Executing ${suites.length} test suites against live backend...`);
console.log('===============================================================\n');

let suitesPassed = 0;
let suitesFailed = 0;
const results = [];

const isWindows = process.platform === 'win32';
const npxCommand = isWindows ? 'npx.cmd' : 'npx';

for (const suite of suites) {
  const filePath = join(__dirname, suite.file);
  console.log(`\n>>> Running: ${suite.name} (${suite.file}) ...`);
  const startTime = Date.now();

  const child = spawnSync(npxCommand, ['tsx', filePath], {
    stdio: 'inherit',
    cwd: join(__dirname, '..'),
    env: { ...process.env },
    shell: true,
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  if (child.status === 0) {
    console.log(`>>> [PASS] ${suite.name} in ${durationSec}s`);
    suitesPassed++;
    results.push({ name: suite.name, status: 'PASS', duration: `${durationSec}s` });
  } else {
    console.error(`>>> [FAIL] ${suite.name} (Exit code: ${child.status}) in ${durationSec}s`);
    suitesFailed++;
    results.push({ name: suite.name, status: 'FAIL', duration: `${durationSec}s` });
  }
}

console.log('\n===============================================================');
console.log('--- FINAL TEST EXECUTION SUMMARY ---');
console.log('===============================================================');
for (const res of results) {
  console.log(`- [${res.status}] ${res.name} (${res.duration})`);
}
console.log('---------------------------------------------------------------');
console.log(`Suites Summary: ${suitesPassed} passed, ${suitesFailed} failed out of ${suites.length}`);
console.log('===============================================================\n');

if (suitesFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
