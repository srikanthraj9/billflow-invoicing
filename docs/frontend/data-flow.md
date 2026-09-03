# BillFlow — Frontend Data Flow & State Architecture

This document describes how data flows from user actions in React components through domain services and network boundaries to the backend, and back into the UI.

---

## 1. End-to-End Data Flow Pipeline

```
React Page / Component (e.g. InvoicesPage)
       │
       │ 1. Triggers Action (e.g. invoiceService.getInvoices(filters))
       ▼
Domain Service Layer (src/lib/services/invoiceService.ts)
       │
       │ 2. Serializes query params & prepares API contract
       ▼
Central API Client (src/lib/api-client.ts)
       │
       │ 3. Injects Authorization: Bearer <token> from localStorage
       ▼
FastAPI REST API
       │
       │ 4. Verifies JWT, queries database, calculates authoritative math
       ▼
HTTP JSON Response (snake_case data structure)
       │
       ▼
Central API Client
       │
       │ 5. Checks status code; wraps errors as typed ApiError instances
       ▼
Domain Service Layer
       │
       │ 6. Normalizes snake_case response into camelCase TypeScript model
       ▼
React Component State Setter
       │
       │ 7. Updates useState/useReducer; re-renders clean UI
       ▼
Rendered UI
```

---

## 2. Authentication Token Lifecycle

1. **Storage Mechanism**: The JWT access token is stored in the browser's `localStorage` under the key `billflow_access_token`.
2. **Accessors (`src/lib/auth-token.ts`)**:
   - `getAuthToken()`: Retrieves current active token.
   - `setAuthToken(token)`: Writes new token upon registration or login.
   - `removeAuthToken()`: Clears token upon logout or session invalidation.
3. **Automatic Interception**:
   Every request made via `apiClient` checks `getAuthToken()`. If a token exists and `skipAuth` is not true, the header `Authorization: Bearer <token>` is attached.
4. **Session Expiry & 401 Handling**:
   If the backend returns `401 Unauthorized` on an authenticated endpoint, `apiClient`:
   - Wipes the stored token (`removeAuthToken()`).
   - Clears any in-memory user cache.
   - Redirects the browser window to `/login`.

---

## 3. Why the Frontend Does Not Calculate Authoritative Totals

While the frontend calculates instantaneous previews in the invoice builder (`LineItemsEditor.tsx` and `InvoiceSummary.tsx`) so that the user receives immediate visual feedback, **the frontend never persists or dictates financial totals**.

### Reasons for Server-Authoritative Totals:
1. **JavaScript Floating-Point Inaccuracy**:
   Binary floating-point arithmetic in JavaScript (`0.1 + 0.2 === 0.30000000000000004`) cannot be trusted for financial ledgers, taxes, and customer billing.
2. **Client-Side Tampering Prevention**:
   A malicious user or rogue extension could modify client-side JavaScript to submit `total_amount: 1.00` on an invoice worth `$1,000.00`.
3. **Source of Truth Enforcement**:
   The backend recalculates:
   - Line Item Amount = `ROUND_HALF_UP(Quantity * Unit Rate)`
   - Subtotal = `Sum(Line Item Amounts)`
   - Taxable Base = `Subtotal - Discount Amount`
   - Tax Amount = `ROUND_HALF_UP(Taxable Base * (Tax% / 100))`
   - Total Amount = `Taxable Base + Tax Amount`
   The backend discards any client-supplied totals and persists only its own verified values.
4. **Consistency**:
   The exact same numbers appear across the merchant dashboard, client view, PDF export, and public payment portal.
