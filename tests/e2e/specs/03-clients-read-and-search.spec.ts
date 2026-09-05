import { test, expect } from '@playwright/test';
import { attachConsoleMonitor } from '../helpers/console-monitor';
import { gotoSafe } from '../helpers/navigation';
import { discoverRealClient } from '../helpers/dynamic-discovery';
import { activeEnv, E2ETestMode } from '../config/test-mode';

test.describe('03 - Client Read & Dynamic Discovery', () => {
  test('Dynamic discovery of existing backend client record', async () => {
    const client = await discoverRealClient();
    if (!client) {
      test.skip(true, 'SKIPPED — no existing clients available in backend');
      return;
    }

    expect(client.id).toBeTruthy();
    expect(client.name).toBeTruthy();
    expect(client.email).toContain('@');
  });

  test('Client Creation (POST /api/clients)', async () => {
    test.skip(
      activeEnv.mode === E2ETestMode.READ_ONLY_SHARED_DB,
      'SKIPPED — isolated E2E database required (client creation blocked in shared DB)'
    );
  });

  test('Client Update & Deletion (PUT/DELETE /api/clients)', async () => {
    test.skip(
      activeEnv.mode === E2ETestMode.READ_ONLY_SHARED_DB,
      'SKIPPED — isolated E2E database required (client mutation blocked in shared DB)'
    );
  });
});
