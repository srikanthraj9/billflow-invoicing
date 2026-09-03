/**
 * Automated Verification Script for Stage 8B Frontend Clients Integration.
 * Tests clientService, api-client, and tenant isolation against live FastAPI backend.
 */

import { apiClient, ApiError } from '../src/lib/api-client';
import { setAuthToken, removeAuthToken, hasAuthToken } from '../src/lib/auth-token';
import { authService } from '../src/lib/services/authService';
import { clientService } from '../src/lib/services/clientService';

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
  location: { pathname: '/clients', href: '/clients' },
};

async function runClientIntegrationTests() {
  console.log('--- Starting Stage 8B Client Integration Verification ---');
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

  const timestamp = Date.now();
  const userA_email = `client_test_a_${timestamp}@example.com`;
  const userB_email = `client_test_b_${timestamp}@example.com`;
  const password = 'Password123!';

  let userA_token = '';
  let userB_token = '';
  let createdClientA_id = '';
  let createdClientA2_id = '';
  let invoiceId = '';

  try {
    // 1. Setup: Register & Login User A
    await authService.signup({ name: 'User A', email: userA_email, password });
    const userA = await authService.getCurrentUser();
    userA_token = (globalThis as any).localStorage.getItem('billflow_access_token') || '';
    assert(Boolean(userA) && userA?.email === userA_email, '1. Authenticated as User A');

    // 2. Empty client list for new user
    const initialClients = await clientService.getClients();
    assert(Array.isArray(initialClients) && initialClients.length === 0, '2. New user starts with empty client list');

    // 3. Create Client 1
    const newClientData = {
      name: 'Acme Corporation',
      email: 'contact@acmecorp.com',
      company: 'Acme Global Industries',
      phone: '+1 555-0199',
      address: '100 Acme Way, Metropolis, NY',
    };
    const createdClient = await clientService.createClient(newClientData);
    createdClientA_id = createdClient.id;
    assert(
      Boolean(createdClient.id) &&
      createdClient.name === newClientData.name &&
      createdClient.company === newClientData.company &&
      createdClient.email === newClientData.email,
      '3. Create client returns normalized client with backend UUID'
    );

    // 4. Created client appears in GET /api/clients
    const clientsAfterCreate = await clientService.getClients();
    assert(
      clientsAfterCreate.length === 1 && clientsAfterCreate[0].id === createdClientA_id,
      '4. Created client appears in GET /api/clients list'
    );

    // 5. Server-side search by name
    const searchByName = await clientService.getClients({ search: 'Acme' });
    assert(searchByName.length === 1 && searchByName[0].id === createdClientA_id, '5. Server-side search by name');

    // 6. Server-side search by email
    const searchByEmail = await clientService.getClients({ search: 'contact@acmecorp.com' });
    assert(searchByEmail.length === 1 && searchByEmail[0].id === createdClientA_id, '6. Server-side search by email');

    // 7. Server-side search by company
    const searchByCompany = await clientService.getClients({ search: 'Industries' });
    assert(searchByCompany.length === 1 && searchByCompany[0].id === createdClientA_id, '7. Server-side search by company');

    // 8. Server-side search by phone
    const searchByPhone = await clientService.getClients({ search: '555-0199' });
    assert(searchByPhone.length === 1 && searchByPhone[0].id === createdClientA_id, '8. Server-side search by phone');

    // 8b. Server-side search with no match
    const searchNoMatch = await clientService.getClients({ search: 'NonExistentXYZCompany' });
    assert(searchNoMatch.length === 0, '8b. Server-side search with non-matching term returns 0 clients');

    // 9. Get client by ID
    const singleClient = await clientService.getClientById(createdClientA_id);
    assert(
      singleClient !== null && singleClient.id === createdClientA_id && singleClient.name === 'Acme Corporation',
      '9. getClientById fetches client details'
    );

    // 10. Update client
    const updatedClient = await clientService.updateClient(createdClientA_id, {
      name: 'Acme International',
      phone: '+1 555-0200',
    });
    assert(
      updatedClient.name === 'Acme International' && updatedClient.phone === '+1 555-0200',
      '10. updateClient updates specified fields'
    );

    // 11. Updated values persist in GET
    const verifiedUpdate = await clientService.getClientById(createdClientA_id);
    assert(
      verifiedUpdate?.name === 'Acme International' && verifiedUpdate?.phone === '+1 555-0200',
      '11. Updated client values persist in database'
    );

    // 12. Create Client 2 and Delete Client without invoices
    const client2 = await clientService.createClient({
      name: 'Beta Temporary LLC',
      email: 'beta@temporary.com',
    });
    createdClientA2_id = client2.id;
    const deleteResult = await clientService.deleteClient(createdClientA2_id);
    assert(deleteResult === true, '12a. deleteClient without invoices returns true');
    const checkDeleted = await clientService.getClientById(createdClientA2_id);
    assert(checkDeleted === null, '12b. Deleted client is no longer accessible via getClientById');

    // 13. Invoice delete protection (HTTP 409 Conflict)
    // Create an invoice referencing createdClientA_id
    const invoiceRes = await apiClient.post<{ id: string }>('/invoices', {
      client_id: createdClientA_id,
      issue_date: '2026-09-01',
      due_date: '2026-09-15',
      items: [{ description: 'Consulting', quantity: 1, rate: 100 }],
    });
    invoiceId = invoiceRes.id;

    try {
      await clientService.deleteClient(createdClientA_id);
      assert(false, '13. deleteClient with invoice should throw 409 ApiError');
    } catch (err: any) {
      assert(
        err instanceof ApiError &&
        err.status === 409 &&
        err.message.toLowerCase().includes('invoices'),
        '13. deleteClient with existing invoices throws 409 Conflict with friendly invoice protection message'
      );
    }

    // 14. Invalid client ID returns friendly null (404 handled)
    const nonexistentClient = await clientService.getClientById('00000000-0000-0000-0000-000000000000');
    assert(nonexistentClient === null, '14. Non-existent UUID returns null instead of throwing');

    // 15. Unauthenticated request returns 401
    removeAuthToken();
    try {
      await clientService.getClients();
      assert(false, '15. Unauthenticated request should throw ApiError');
    } catch (err: any) {
      assert(err instanceof ApiError && err.status === 401, '15. Unauthenticated request throws 401');
    }

    // 16. Tenant isolation: Register User B
    setAuthToken('');
    authService.clearUserCache();
    await authService.signup({ name: 'User B', email: userB_email, password });
    const userB = await authService.getCurrentUser();
    userB_token = (globalThis as any).localStorage.getItem('billflow_access_token') || '';
    assert(Boolean(userB) && userB?.email === userB_email, '16a. Authenticated as User B');

    // User B lists clients -> must NOT see User A's client
    const userB_clients = await clientService.getClients();
    assert(userB_clients.length === 0, '16b. User B cannot see User A\'s clients in GET /api/clients');

    // User B attempts to access User A's client by ID -> returns null (404)
    const userB_crossAccess = await clientService.getClientById(createdClientA_id);
    assert(userB_crossAccess === null, '16c. User B cannot access User A\'s client by ID (returns 404/null)');

    // User B attempts to delete User A's client -> throws 404
    try {
      await clientService.deleteClient(createdClientA_id);
      assert(false, '16d. User B deleting User A\'s client should throw 404');
    } catch (err: any) {
      assert(err instanceof ApiError && err.status === 404, '16d. User B deleting User A\'s client returns 404 Not Found');
    }

  } finally {
    // 17. Cleanup test data
    console.log('--- Cleaning up test artifacts ---');
    try {
      // Re-authenticate as User A to clean up invoice and client
      if (userA_token) {
        setAuthToken(userA_token);
        if (invoiceId) {
          await apiClient.delete(`/invoices/${invoiceId}`).catch(() => {});
        }
        if (createdClientA_id) {
          await clientService.deleteClient(createdClientA_id).catch(() => {});
        }
      }
      removeAuthToken();
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }

  // Summary
  console.log(`\n========================================`);
  console.log(`Stage 8B Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`========================================\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runClientIntegrationTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
