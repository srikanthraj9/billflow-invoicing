/**
 * Client Service for BillFlow.
 * Communicates with the FastAPI backend (/api/clients) via the centralized apiClient.
 */

import { apiClient, ApiError } from '../api-client';
import { Client, ClientFilters } from '../types';

interface BackendClientResponse {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at: string;
  updated_at: string;
}

interface BackendClientListResponse {
  items: BackendClientResponse[];
  total: number;
  limit: number;
  offset: number;
}

function normalizeClient(b: BackendClientResponse): Client {
  return {
    id: b.id,
    name: b.name,
    email: b.email || '',
    company: b.company || undefined,
    address: b.address || undefined,
    phone: b.phone || undefined,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    invoiceCount: 0,
  };
}

export const clientService = {
  /**
   * Fetches all clients for the authenticated user from GET /api/clients.
   * Performs server-side search, sorting, and pagination.
   */
  async getClients(filters?: ClientFilters): Promise<Client[]> {
    const params: Record<string, string | number | boolean | undefined | null> = {
      limit: 100,
      offset: 0,
    };

    if (filters?.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }

    if (filters?.sortBy === 'recent') {
      params.sort_by = 'recent';
    } else {
      params.sort_by = 'name';
    }

    const response = await apiClient.get<BackendClientListResponse>('/clients', {
      params,
    });

    return response.items.map(normalizeClient);
  },

  /**
   * Fetches a single client by ID from GET /api/clients/{id}.
   * Returns null if not found (404) or cross-tenant.
   */
  async getClientById(id: string): Promise<Client | null> {
    try {
      const response = await apiClient.get<BackendClientResponse>(`/clients/${id}`);
      return normalizeClient(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Creates a new client via POST /api/clients.
   * Only transmits valid backend fields (name, email, company, phone, address).
   */
  async createClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const payload = {
      name: data.name.trim(),
      email: data.email?.trim() || null,
      company: data.company?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
    };

    const response = await apiClient.post<BackendClientResponse>('/clients', payload);
    return normalizeClient(response);
  },

  /**
   * Updates an existing client via PUT /api/clients/{id}.
   * Only transmits defined fields.
   */
  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    const payload: Record<string, string | null> = {};

    if (data.name !== undefined) {
      payload.name = data.name.trim();
    }
    if (data.email !== undefined) {
      payload.email = data.email.trim() || null;
    }
    if (data.company !== undefined) {
      payload.company = data.company?.trim() || null;
    }
    if (data.phone !== undefined) {
      payload.phone = data.phone?.trim() || null;
    }
    if (data.address !== undefined) {
      payload.address = data.address?.trim() || null;
    }

    const response = await apiClient.put<BackendClientResponse>(`/clients/${id}`, payload);
    return normalizeClient(response);
  },

  /**
   * Deletes a client via DELETE /api/clients/{id}.
   * Returns true on 204 No Content.
   * Throws ApiError on 409 Conflict if invoices exist.
   */
  async deleteClient(id: string): Promise<boolean> {
    await apiClient.delete<void>(`/clients/${id}`);
    return true;
  },
};
