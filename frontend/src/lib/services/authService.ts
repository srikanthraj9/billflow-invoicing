/**
 * Authentication Service for BillFlow.
 * Replaces mock auth with real FastAPI backend communication via apiClient.
 */

import { apiClient, ApiError } from '../api-client';
import { getAuthToken, hasAuthToken, removeAuthToken, setAuthToken } from '../auth-token';
import { User } from '../types';

interface BackendUserResponse {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  created_at: string;
}

interface BackendTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: BackendUserResponse;
}

let cachedUser: User | null = null;
let cachedUserToken: string | null = null;
let currentUserPromise: Promise<User | null> | null = null;

function normalizeUser(backendUser: BackendUserResponse): User {
  const displayName = backendUser.full_name?.trim() || backendUser.email.split('@')[0];
  return {
    id: backendUser.id,
    name: displayName,
    email: backendUser.email,
    businessName: displayName,
    businessEmail: backendUser.email,
    businessAddress: '',
    businessPhone: '',
    currency: 'INR',
    invoicePrefix: 'INV',
  };
}

export const authService = {
  /**
   * Retrieves the current authenticated user profile from backend GET /auth/me.
   * Uses in-flight Promise deduplication so simultaneous component calls spawn only 1 HTTP request.
   * Returns null if not authenticated or if token is expired/invalid.
   */
  async getCurrentUser(): Promise<User | null> {
    const token = getAuthToken();
    if (!token) {
      cachedUser = null;
      cachedUserToken = null;
      currentUserPromise = null;
      return null;
    }

    if (cachedUser && cachedUserToken === token) {
      return cachedUser;
    }

    if (currentUserPromise) {
      return currentUserPromise;
    }

    currentUserPromise = (async () => {
      try {
        const backendUser = await apiClient.get<BackendUserResponse>('/auth/me');
        cachedUser = normalizeUser(backendUser);
        cachedUserToken = token;
        return cachedUser;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          removeAuthToken();
          cachedUser = null;
          cachedUserToken = null;
          return null;
        }
        // If network fails, clear cache and return null safely
        cachedUser = null;
        cachedUserToken = null;
        return null;
      } finally {
        currentUserPromise = null;
      }
    })();

    return currentUserPromise;
  },

  /**
   * Authenticates user against backend POST /auth/login and stores JWT access token.
   */
  async login(email: string, password?: string): Promise<User> {
    if (!password) {
      throw new Error('Password is required.');
    }

    const payload = {
      email: email.trim().toLowerCase(),
      password,
    };

    const tokenResponse = await apiClient.post<BackendTokenResponse>('/auth/login', payload, {
      skipAuth: true,
    });

    setAuthToken(tokenResponse.access_token);
    cachedUser = normalizeUser(tokenResponse.user);
    cachedUserToken = tokenResponse.access_token;
    return cachedUser;
  },

  /**
   * Registers a new user account via POST /auth/register, then logs in to obtain JWT.
   */
  async signup(data: { name: string; email: string; password?: string }): Promise<User> {
    if (!data.password) {
      throw new Error('Password is required.');
    }

    const payload = {
      full_name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
    };

    // Step 1: Register user account
    await apiClient.post<BackendUserResponse>('/auth/register', payload, {
      skipAuth: true,
    });

    // Step 2: Log in immediately to establish authenticated session
    return this.login(data.email, data.password);
  },

  /**
   * Google OAuth placeholder.
   * In Stage 8A, backend does not support Google OAuth yet; returns a clear message.
   */
  async loginWithGoogle(): Promise<User> {
    throw new Error('Google Sign-In is not currently enabled. Please sign in with your email and password.');
  },

  /**
   * Signs the user out by clearing stored JWT and cached state.
   */
  async logout(): Promise<void> {
    removeAuthToken();
    cachedUser = null;
    cachedUserToken = null;
    currentUserPromise = null;

    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  /**
   * Checks whether the user is currently authenticated with a token.
   */
  isAuthenticated(): boolean {
    return hasAuthToken();
  },

  /**
   * Clears the in-memory cached user without wiping the token.
   */
  clearUserCache(): void {
    cachedUser = null;
    cachedUserToken = null;
    currentUserPromise = null;
  },
};
