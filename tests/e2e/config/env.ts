/**
 * Safe Environment & Credential Provider for E2E Tests
 * NEVER exposes or logs passwords.
 */

export interface E2ECredentials {
  email?: string;
  password?: string;
  hasCredentials: boolean;
}

export function getE2ECredentials(): E2ECredentials {
  const email = process.env.E2E_TEST_EMAIL?.trim();
  const password = process.env.E2E_TEST_PASSWORD?.trim();

  return {
    email: email || undefined,
    password: password || undefined,
    hasCredentials: Boolean(email && password),
  };
}

export const credentials = getE2ECredentials();
