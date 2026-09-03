# BillFlow — Security Verification & Audit

This document summarizes the comprehensive security validations performed across authentication, tenant isolation, financial math, public invoice privacy, concurrency, and secrets handling.

---

## 1. Authentication & Session Security

- **Bcrypt Password Hashing**: Passwords are never stored in plaintext. They are salted and hashed using Passlib's bcrypt implementation. Serialized user schemas explicitly omit password hashes.
- **Stateless JWT Tokens**: Signed using HMAC-SHA256 (`HS256`). Tokens include expiration timestamps (`exp`) and user UUIDs (`sub`).
- **Generic Error Responses**: Failed authentication attempts return generic `401 Unauthorized` responses with `"Invalid email or password"`, preventing username enumeration.
- **Weak Password Rejection**: The registration endpoint rejects passwords under 8 characters with `422 Unprocessable Entity`.
- **Automatic Token Invalidation**: 401 responses on protected frontend routes trigger immediate `localStorage` token removal and login redirection.

---

## 2. Multi-Tenant Data Isolation

- **Query-Level Scoping**: Every database query for clients, invoices, or settings explicitly filters by `user_id = current_user.id`.
- **Cross-Tenant Mutation Blocking**: User B cannot fetch, update, or delete any entity owned by User A. Cross-tenant queries return `404 Not Found`.
- **Client Ownership Verification**: When creating an invoice, the backend asserts that `client_id` belongs to the authenticated user. Passing a client belonging to another user raises `404 Not Found`.
- **Dashboard Metric Segregation**: User B's dashboard metrics report `0.00` earnings, `0` invoices, and `0` overdue amounts regardless of User A's activity.

---

## 3. Financial Integrity & Tampering Prevention

- **Server-Side Authoritative Math**: Line amounts, subtotals, taxable bases, taxes, and totals are computed authoritatively on the backend using Python's `decimal.Decimal` with `ROUND_HALF_UP` quantization.
- **Tampering Ignored**: If a client sends manipulated values (`subtotal: 10, total_amount: 10`), the backend discards them and stores its own recalculated numbers.
- **State Machine Enforcement**: State transitions strictly follow `draft` ➔ `sent` ➔ `paid`. Illegal transitions (e.g. `draft` ➔ `paid` or `sent` ➔ `draft`) are rejected with `400 Bad Request`.
- **Paid Invoice Immutability**: Once marked `paid`, an invoice's line items, notes, client, totals, and status are completely locked against further modification or deletion.

---

## 4. Public Invoice Security & Privacy Sanitization

- **Cryptographic High Entropy**: Invoices are assigned a 32-byte URL-safe cryptographic token (`secrets.token_urlsafe(32)`), offering ~256 bits of entropy that prevents brute-force guessing.
- **Draft Privacy Shielding**: Public requests for invoices in `draft` status return `404 Not Found`. Only invoices explicitly dispatched (`sent`, `overdue`, or `paid`) are viewable.
- **UUID & Metadata Sanitization**: The public response schema strips all internal database UUIDs (`id`, `user_id`, `client_id`, `item_id`) and the public token itself.
- **No Credentials Required**: Customers view and pay invoices without sending JWT tokens or Authorization headers.

---

## 5. Concurrency & Double-Payment Protection

- **Row-Level Database Locking**: The payment settlement endpoint executes an atomic PostgreSQL transaction with `SELECT ... FOR UPDATE` row-level locking.
- **Idempotency Guarantee**: If an invoice is already `paid`, the transaction aborts and returns `400 Bad Request` with message `"Invoice is already paid"`. Concurrent requests cannot double-pay an invoice.

---

## 6. Media Storage Security (Supabase Storage)

- **Backend-Only Service Role**: The `SUPABASE_SERVICE_ROLE_KEY` is kept strictly within `backend/.env` and is never exposed to the frontend, browser, or source repository.
- **Strict File Size Limits**: Files exceeding 2 MB are rejected with `413 Request Entity Too Large`.
- **Deep Image Verification**: Python's `Pillow` library parses the binary image stream to verify genuine image headers, valid dimensions, and uncorrupted file data, preventing disguised script or malware uploads.
- **User-Isolated Storage Paths**: Logos are stored in isolated paths scoped by user UUID: `users/{user_id}/logo/{uuid}.{ext}`.
