/**
 * Centralized API Client for BillFlow.
 * Handles HTTP requests to the FastAPI backend, authentication headers,
 * error normalization, and token-expiry handling.
 */

import { getAuthToken, removeAuthToken } from './auth-token';

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export class ApiError extends Error {
  status: number;
  detail?: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Extracts a user-friendly error message from FastAPI response data.
 */
function parseErrorMessage(status: number, data: unknown): string {
  if (data && typeof data === 'object') {
    const errorObj = data as Record<string, unknown>;

    // Case 1: FastAPI HTTPException detail string: { detail: "Invalid credentials" }
    if (typeof errorObj.detail === 'string' && errorObj.detail.trim()) {
      return errorObj.detail.trim();
    }

    // Case 2: Pydantic v2 validation errors: { detail: [{ loc: [...], msg: "..." }] }
    if (Array.isArray(errorObj.detail) && errorObj.detail.length > 0) {
      const messages = errorObj.detail
        .map((item) => {
          if (item && typeof item === 'object' && 'msg' in item && typeof item.msg === 'string') {
            return item.msg;
          }
          return null;
        })
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join('. ');
      }
    }

    // Case 3: Generic message field
    if (typeof errorObj.message === 'string' && errorObj.message.trim()) {
      return errorObj.message.trim();
    }
  }

  // Status code fallbacks
  switch (status) {
    case 400:
      return 'Invalid request. Please verify your input.';
    case 401:
      return 'Invalid email or password.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'A conflict occurred. An account with this email may already exist.';
    case 413:
      return 'Uploaded file exceeds the maximum allowed size.';
    case 415:
      return 'Unsupported media type. Please upload a valid image.';
    case 422:
      return 'Validation error. Please check your submitted data.';
    case 500:
    case 502:
    case 503:
      return 'Server error. Please try again later.';
    default:
      return `Request failed with status ${status}.`;
  }
}

class ApiClient {
  private get baseUrl(): string {
    const url = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    return url.replace(/\/+$/, '');
  }

  /**
   * Dispatches a fetch request with automatic auth header injection,
   * JSON serialization, and centralized error handling.
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, params, headers = {}, body, ...customConfig } = options;

    // Build URL with optional query parameters
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let urlString = `${this.baseUrl}${cleanEndpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        urlString += (urlString.includes('?') ? '&' : '?') + queryString;
      }
    }

    // Construct headers
    const reqHeaders: Record<string, string> = {
      ...(headers as Record<string, string>),
    };

    // Attach Authorization header if authenticated and not explicitly skipped
    if (!skipAuth) {
      const token = getAuthToken();
      if (token) {
        reqHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Determine body and Content-Type
    let reqBody: BodyInit | undefined = body as BodyInit | undefined;
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    if (body && !isFormData && typeof body === 'object' && !(body instanceof Blob)) {
      reqHeaders['Content-Type'] = 'application/json';
      reqBody = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(urlString, {
        ...customConfig,
        headers: reqHeaders,
        body: reqBody,
      });
    } catch (networkError) {
      console.error('Network failure connecting to API:', networkError);
      throw new ApiError(0, 'Unable to connect to the server. Please check your internet connection.');
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    // Parse response body
    let responseData: unknown;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      responseData = await response.text();
    }

    // Error handling
    if (!response.ok) {
      // If 401 Unauthorized occurs on an authenticated endpoint, clean up session
      if (response.status === 401 && !skipAuth) {
        removeAuthToken();

        // Redirect to login in browser if not already on an auth page
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/signup') {
            window.location.href = '/login';
          }
        }
      }

      const friendlyMessage = parseErrorMessage(response.status, responseData);
      throw new ApiError(response.status, friendlyMessage, responseData);
    }

    return responseData as T;
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data as BodyInit,
    });
  }

  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data as BodyInit,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
