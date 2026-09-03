/**
 * Automated Verification Script for Stage 8A Frontend Auth & API Client Integration.
 * Executes against the running FastAPI backend server (http://127.0.0.1:8000/api).
 */

import { apiClient, ApiError } from '../src/lib/api-client';
import { getAuthToken, setAuthToken, removeAuthToken, hasAuthToken } from '../src/lib/auth-token';
import { authService } from '../src/lib/services/authService';

// Polyfill minimal localStorage and window for Node environment
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) || null; }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;
(globalThis as any).window = {
  location: { pathname: '/dashboard', href: '/dashboard' },
};

async function runTests() {
  console.log('--- Starting Stage 8A Integration Verification ---');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`[PASS] ${description}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${description}`);
      testsFailed++;
    }
  }

  const uniqueSuffix = Date.now();
  const testEmail = `stage8a_test_${uniqueSuffix}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Stage8A Test User';

  // 1. Health check via apiClient
  try {
    const health = await apiClient.get<{ status: string; database: string }>('/health', { skipAuth: true });
    assert(health.status === 'healthy' && health.database === 'connected', '1. apiClient GET /health succeeds with 200');
  } catch (err) {
    assert(false, `1. apiClient GET /health failed: ${err}`);
  }

  // 2. Token storage utility tests
  removeAuthToken();
  assert(!hasAuthToken() && getAuthToken() === null, '2a. removeAuthToken clears token state');
  setAuthToken('test_token_abc');
  assert(hasAuthToken() && getAuthToken() === 'test_token_abc', '2b. setAuthToken stores and retrieves token');
  removeAuthToken();
  assert(!hasAuthToken(), '2c. removeAuthToken cleans up token');

  // 3. Invalid login handling (401)
  try {
    await authService.login('nonexistent_user_xyz@example.com', 'WrongPassword123!');
    assert(false, '3. Invalid login should throw ApiError');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.status === 401 && err.message.toLowerCase().includes('invalid email or password'),
      '3. Invalid login returns 401 and sanitized user-friendly message'
    );
    assert(!hasAuthToken(), '3b. Failed login does not persist any token');
  }

  // 4. Signup flow
  try {
    const newUser = await authService.signup({
      name: testName,
      email: testEmail,
      password: testPassword,
    });
    assert(newUser.email === testEmail && newUser.name === testName, '4a. authService.signup registers and returns normalized user');
    assert(hasAuthToken(), '4b. authService.signup immediately logs in and sets auth token');
  } catch (err) {
    assert(false, `4. Signup flow failed: ${err}`);
  }

  // 5. Duplicate signup handling (409 Conflict)
  try {
    await authService.signup({
      name: testName,
      email: testEmail,
      password: testPassword,
    });
    assert(false, '5. Duplicate signup should throw 409 ApiError');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.status === 409 && err.message.toLowerCase().includes('already exists'),
      '5. Duplicate signup returns 409 and clean user-facing error message'
    );
  }

  // 6. Get current user via authenticated GET /auth/me
  try {
    authService.clearUserCache();
    const currentUser = await authService.getCurrentUser();
    assert(
      currentUser !== null && currentUser.email === testEmail && currentUser.name === testName,
      '6. authService.getCurrentUser() retrieves real authenticated profile using Bearer token'
    );
  } catch (err) {
    assert(false, `6. getCurrentUser failed: ${err}`);
  }

  // 7. Login flow with valid credentials
  try {
    removeAuthToken();
    authService.clearUserCache();
    const loggedInUser = await authService.login(testEmail, testPassword);
    assert(
      loggedInUser.email === testEmail && hasAuthToken(),
      '7. authService.login() succeeds with valid credentials and stores JWT'
    );
  } catch (err) {
    assert(false, `7. Login flow failed: ${err}`);
  }

  // 8. Logout flow
  try {
    await authService.logout();
    assert(!hasAuthToken(), '8a. authService.logout() wipes JWT token from storage');
    const userAfterLogout = await authService.getCurrentUser();
    assert(userAfterLogout === null, '8b. getCurrentUser() returns null after logout');
  } catch (err) {
    assert(false, `8. Logout flow failed: ${err}`);
  }

  // 9. Expired or Invalid token handling (401 cleanup)
  try {
    setAuthToken('invalid_malformed_jwt_token_12345');
    authService.clearUserCache();
    const invalidResult = await authService.getCurrentUser();
    assert(invalidResult === null && !hasAuthToken(), '9. Invalid token triggers 401 and auto-cleans up storage token');
  } catch (err) {
    assert(false, `9. Invalid token handling failed: ${err}`);
  }

  // 10. Google Auth placeholder verification
  try {
    await authService.loginWithGoogle();
    assert(false, '10. Google OAuth should not fake success');
  } catch (err: any) {
    assert(
      err.message.includes('not currently enabled'),
      '10. Google auth informs user that OAuth is not yet enabled'
    );
  }

  // Summary
  console.log(`\n========================================`);
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`========================================\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
