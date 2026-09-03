/**
 * Centralized authentication token management for BillFlow.
 * Encapsulates localStorage access with browser-safe SSR checks.
 */

const TOKEN_KEY = 'billflow_access_token';

/**
 * Retrieves the stored JWT access token from localStorage.
 * Returns null if not running in a browser environment or if token is not present.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Persists the JWT access token in localStorage.
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store authentication token:', error);
  }
}

/**
 * Removes the stored JWT access token from localStorage.
 */
export function removeAuthToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove authentication token:', error);
  }
}

/**
 * Checks whether an authentication token is currently present.
 */
export function hasAuthToken(): boolean {
  return Boolean(getAuthToken());
}
