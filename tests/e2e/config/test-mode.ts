/**
 * BillFlow E2E Test Mode & Safety Environment Validator
 * Enforces READ_ONLY_SHARED_DB when connected to shared Supabase database.
 */

export enum E2ETestMode {
  READ_ONLY_SHARED_DB = 'READ_ONLY_SHARED_DB',
  FULL_ISOLATED_E2E = 'FULL_ISOLATED_E2E',
}

export function detectE2ETestMode(): {
  mode: E2ETestMode;
  frontendUrl: string;
  hasCredentials: boolean;
  hasIsolatedDb: boolean;
} {
  const frontendUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
  const hasCredentials = Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);

  const e2eDbUrl = process.env.E2E_DATABASE_URL || '';
  const isSharedDb =
    !e2eDbUrl ||
    e2eDbUrl.includes('supabase.co') ||
    e2eDbUrl.includes('pooler.supabase.com') ||
    e2eDbUrl.includes('jtnsakufuckvhwoluntr');

  const hasIsolatedDb = Boolean(e2eDbUrl) && !isSharedDb;
  const mode = hasIsolatedDb ? E2ETestMode.FULL_ISOLATED_E2E : E2ETestMode.READ_ONLY_SHARED_DB;

  return {
    mode,
    frontendUrl,
    hasCredentials,
    hasIsolatedDb,
  };
}

export function printModeBanner(): void {
  const { mode, frontendUrl, hasCredentials, hasIsolatedDb } = detectE2ETestMode();

  console.log('\n========================================');
  console.log('       BillFlow E2E Test Mode');
  console.log(`         ${mode}`);
  console.log('========================================');
  console.log(`Frontend URL:                  ${frontendUrl}`);
  console.log(`E2E Credentials Available:     ${hasCredentials ? 'Yes' : 'No'}`);
  console.log(`Isolated E2E Database:         ${hasIsolatedDb ? 'Yes' : 'No (Blocked for shared database)'}`);
  if (mode === E2ETestMode.READ_ONLY_SHARED_DB) {
    console.log('Safety Notice:                 Read-only mode active. Database writes, test user creation,');
    console.log('                               and client/invoice mutations are strictly prohibited.');
  }
  console.log('========================================\n');
}

export const activeEnv = detectE2ETestMode();
