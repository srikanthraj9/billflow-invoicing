# BillFlow — REST API Architecture

This document specifies the complete REST API surface of the BillFlow backend service, grouped by domain controller.

---

## 1. Health Group (`/api/health`)

### `GET /api/health`
- **Auth**: Public (None)
- **Purpose**: System health check & database ping
- **Response**: `200 OK`
  ```json
  { "status": "healthy", "database": "connected", "version": "1.0.0" }
  ```
- **Validation**: Executes lightweight `SELECT 1` against PostgreSQL to confirm connection pool liveness.

---

## 2. Authentication Group (`/api/auth`)

### `POST /api/auth/register`
- **Auth**: Public
- **Purpose**: Register new merchant account
- **Request Body**:
  ```json
  { "name": "John Doe", "email": "john@example.com", "password": "SecurePassword123!" }
  ```
- **Response**: `201 Created` returning user profile and access token.
- **Validation**: Email must be valid format; password must be >= 8 characters.
- **Security**: Hashes password with bcrypt before persistence; checks for email collision (`409 Conflict`).

### `POST /api/auth/login`
- **Auth**: Public
- **Purpose**: Authenticate user and issue JWT
- **Request Body**:
  ```json
  { "email": "john@example.com", "password": "SecurePassword123!" }
  ```
- **Response**: `200 OK`
  ```json
  { "access_token": "<jwt_string>", "token_type": "bearer", "user": { "id": "...", "name": "...", "email": "..." } }
  ```
- **Security**: Uses constant-time bcrypt verification; returns generic `401 Unauthorized` on wrong credentials to prevent user enumeration.

### `GET /api/auth/me`
- **Auth**: Bearer JWT
- **Purpose**: Retrieve current authenticated user profile
- **Response**: `200 OK` returning `UserResponse`.
- **Security**: Strips password and password_hash from response.

---

## 3. Clients Group (`/api/clients`)

### `GET /api/clients`
- **Auth**: Bearer JWT
- **Purpose**: List clients owned by the authenticated user
- **Query Params**: `search` (optional string), `skip` (int), `limit` (int)
- **Response**: `200 OK` array of `ClientResponse` objects.
- **Security**: Scoped strictly to `user_id = current_user.id`.

### `POST /api/clients`
- **Auth**: Bearer JWT
- **Purpose**: Create a new client record
- **Request Body**: `name` (required, 2-255 chars), `email`, `company`, `phone`, `address`, `notes`
- **Response**: `201 Created` returning created client.

### `GET /api/clients/{id}`
- **Auth**: Bearer JWT
- **Purpose**: Retrieve client details by UUID
- **Security**: Returns `404 Not Found` if client does not exist or belongs to another tenant.

### `PUT /api/clients/{id}`
- **Auth**: Bearer JWT
- **Purpose**: Update client details
- **Security**: Cross-tenant updates return `404 Not Found`.

### `DELETE /api/clients/{id}`
- **Auth**: Bearer JWT
- **Purpose**: Delete client record
- **Validation**: If client has linked invoices, fails with `409 Conflict` (foreign key `RESTRICT`).

---

## 4. Invoices Group (`/api/invoices`)

### `GET /api/invoices`
- **Auth**: Bearer JWT
- **Purpose**: List invoices with filtering and sorting
- **Query Params**: `status`, `client_id`, `search`, `sort_by`, `sort_dir`, `skip`, `limit`
- **Response**: `200 OK` array of `InvoiceResponse` objects with dynamic overdue evaluation.

### `POST /api/invoices`
- **Auth**: Bearer JWT
- **Purpose**: Create new invoice with dynamic line items
- **Request Body**: `client_id`, `issue_date`, `due_date`, `tax_percentage`, `discount_amount`, `currency`, `items: [{description, quantity, unit_rate}]`
- **Validation**: Backend recalculates all line amounts, subtotals, tax, and totals using Python Decimal `ROUND_HALF_UP`.
- **Security**: Generates cryptographic 32-byte public token; assigns sequential invoice number.

### `GET /api/invoices/{id}`
- **Auth**: Bearer JWT
- **Purpose**: Fetch complete invoice with line items and client relationship
- **Security**: Returns `404 Not Found` for cross-tenant access.

### `PUT /api/invoices/{id}`
- **Auth**: Bearer JWT
- **Purpose**: Update invoice content or transition status
- **Validation**: Enforces state machine (`draft` ➔ `sent` ➔ `paid`); rejects illegal jumps (`draft` ➔ `paid`) or edits to `paid` invoices (`400 Bad Request`).

### `DELETE /api/invoices/{id}`
- **Auth**: Bearer JWT
- **Purpose**: Delete invoice
- **Validation**: Only invoices in `draft` status may be deleted; deleting `sent` or `paid` invoices returns `400 Bad Request`.

---

## 5. Public Invoice Group (`/api/public`)

### `GET /api/public/invoices/{token}`
- **Auth**: Public (No Auth Required)
- **Purpose**: Fetch public-facing invoice and merchant profile for customer portal
- **Validation**: If invoice status is `draft`, returns `404 Not Found` to protect unreleased drafts.
- **Security**: Response strips all internal database UUIDs (`id`, `user_id`, `client_id`, `item_id`) and the public token.

### `POST /api/public/invoices/{token}/pay`
- **Auth**: Public (No Auth Required)
- **Purpose**: Settle payment on invoice
- **Validation**: Locks database row (`SELECT ... FOR UPDATE`); transitions invoice to `paid` and stamps `paid_at`.
- **Security**: Idempotent; duplicate payment attempts on already-paid invoices return `400 Bad Request`.

---

## 6. Dashboard Group (`/api/dashboard`)

### `GET /api/dashboard/stats`
- **Auth**: Bearer JWT
- **Purpose**: Retrieve executive metrics and revenue charts
- **Query Params**: `months` (default 6, supports 12)
- **Response**: `200 OK` with `total_earned`, `total_outstanding`, `total_overdue`, invoice counts, monthly revenue timeline, and recent 5 invoices.
- **Security**: Aggregated strictly for `current_user.id`.

---

## 7. Business Settings Group (`/api/settings`)

### `GET /api/settings`
- **Auth**: Bearer JWT
- **Purpose**: Fetch merchant profile, currency, invoice prefix, default tax & payment terms
- **Response**: `200 OK` returning `BusinessSettingsResponse`.

### `PUT /api/settings`
- **Auth**: Bearer JWT
- **Purpose**: Update merchant profile and invoice defaults
- **Validation**: Does not permit arbitrary overwriting of `logo_url` (must use dedicated logo endpoints).

### `POST /api/settings/logo`
- **Auth**: Bearer JWT
- **Purpose**: Upload merchant logo
- **Validation**: Max file size 2 MB; allowed MIME types (`image/png`, `image/jpeg`, `image/webp`); deep Pillow verification of image headers.
- **Security**: Uploaded to isolated Supabase path `users/{user_id}/logo/{uuid}.{ext}`.

### `DELETE /api/settings/logo`
- **Auth**: Bearer JWT
- **Purpose**: Delete merchant logo from Supabase Storage and database
- **Response**: `204 No Content`.
