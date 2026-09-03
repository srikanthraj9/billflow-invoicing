# BillFlow — Backend Development Stages (Stages 1–7)

This document chronicles the seven engineering stages of the BillFlow backend service.

---

## Stage 1 — Foundation & Database Architecture

- **Objective**: Establish the core backend infrastructure, configuration management, SQLAlchemy 2.0 database engine, and initial Alembic migrations.
- **Architecture**: Asynchronous FastAPI application using Pydantic Settings, scoped database sessions via `get_db()`, and psycopg driver.
- **Files Created**: `app/main.py`, `app/core/config.py`, `app/core/database.py`, `app/models/base.py`, `alembic.ini`, `alembic/env.py`, `alembic/versions/4c4fa5194993_initial_schema_users_clients_invoices_.py`.
- **API Endpoints**: `GET /api/health`, `GET /`.
- **Database Impact**: Initialized tables: `users`, `clients`, `invoices`, `invoice_items`, `business_settings`.
- **Security Considerations**: Connection pool timeouts, non-privileged database user, strict environment parsing.
- **Tests**: Healthcheck database ping test.
- **Result**: COMPLETE — Base service healthy and migrations applied.

---

## Stage 2 — Authentication & Security

- **Objective**: Implement secure user registration, bcrypt password hashing, stateless JWT authentication, and current user profile endpoints.
- **Architecture**: Stateless HS256 JWT tokens with user UUID in `sub` claim; dependency injection (`deps.get_current_user`) for protected routes.
- **Files Created**: `app/core/security.py`, `app/models/user.py`, `app/schemas/auth.py`, `app/services/auth.py`, `app/api/auth.py`, `app/api/deps.py`, `tests/test_auth.py`.
- **API Endpoints**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
- **Database Impact**: Populated `users` table; automatic default `business_settings` initialization on signup.
- **Security Considerations**: Passlib bcrypt hashing with automatic salts; generic 401 on login failure to prevent username harvesting; passwords stripped from serialization schemas.
- **Tests**: 22 Pytest tests in `tests/test_auth.py` verifying registration, weak password rejection, token validation, and expiry.
- **Result**: COMPLETE — 22/22 tests passed.

---

## Stage 3 — Client Management API

- **Objective**: Implement multi-tenant client CRUD, server-side multi-column search, and foreign key deletion protections.
- **Architecture**: Service layer abstraction (`ClientService`) enforcing tenant isolation on every operation.
- **Files Created**: `app/models/client.py`, `app/schemas/client.py`, `app/services/client.py`, `app/api/clients.py`, `tests/test_clients.py`.
- **API Endpoints**: `GET /api/clients`, `POST /api/clients`, `GET /api/clients/{id}`, `PUT /api/clients/{id}`, `DELETE /api/clients/{id}`.
- **Database Impact**: Foreign key constraint `clients.user_id ➔ users.id (CASCADE)`; `ON DELETE RESTRICT` from invoices to clients.
- **Security Considerations**: Strict tenant isolation (`WHERE user_id = current_user.id`); cross-tenant access returns 404.
- **Tests**: 18 Pytest tests in `tests/test_clients.py` verifying search, CRUD, and RESTRICT rejection.
- **Result**: COMPLETE — 18/18 tests passed.

---

## Stage 4 — Invoice Engine & Authoritative Calculations

- **Objective**: Build the dynamic invoice builder, sequential numbering, state machine transitions, and server-side decimal math engine.
- **Architecture**: Authoritative finance module (`app/core/finance.py`) using `decimal.Decimal` with `ROUND_HALF_UP` rounding to 2 decimal places.
- **Files Created**: `app/core/finance.py`, `app/models/invoice.py`, `app/models/invoice_item.py`, `app/schemas/invoice.py`, `app/services/invoice.py`, `app/api/invoices.py`, `tests/test_invoices.py`.
- **API Endpoints**: `GET /api/invoices`, `POST /api/invoices`, `GET /api/invoices/{id}`, `PUT /api/invoices/{id}`, `DELETE /api/invoices/{id}`.
- **Database Impact**: Populated `invoices` and `invoice_items` tables; created indexes on `public_token`, `invoice_number`, `status`.
- **Security Considerations**: Ignores client-supplied financial totals; rejects illegal state transitions (draft ➔ paid, paid ➔ sent); paid invoices are immutable.
- **Tests**: 36 Pytest tests in `tests/test_invoices.py` covering decimal rounding, sequential numbers, and state transitions.
- **Result**: COMPLETE — 36/36 tests passed.

---

## Stage 5 — Public Invoices & Simulated Payment

- **Objective**: Provide a secure, unauthenticated customer payment portal and simulated payment processing with concurrency protection.
- **Architecture**: High-entropy 32-byte URL-safe cryptographic tokens; atomic row-level locks (`SELECT ... FOR UPDATE`) during payment settlement.
- **Files Created**: `app/schemas/public_invoice.py`, `app/services/public_invoice.py`, `app/api/public.py`, `tests/test_public_invoices.py`.
- **API Endpoints**: `GET /api/public/invoices/{token}`, `POST /api/public/invoices/{token}/pay`.
- **Database Impact**: Updates `status` to `paid` and stamps `paid_at = UTC NOW`.
- **Security Considerations**: Draft invoices return 404; public response strips all internal database UUIDs; payment is idempotent and prevents double billing.
- **Tests**: 18 Pytest tests in `tests/test_public_invoices.py` verifying unauthenticated access, sanitization, and double-pay rejection.
- **Result**: COMPLETE — 18/18 tests passed.

---

## Stage 6 — Dashboard Analytics & Revenue Timeline

- **Objective**: Provide executive KPI aggregations, dynamic overdue calculations, and unbroken 6/12-month revenue timeline feeds.
- **Architecture**: Database-aggregated SQL queries grouped by calendar month; dynamic status evaluation for overdue balances.
- **Files Created**: `app/schemas/dashboard.py`, `app/services/dashboard.py`, `app/api/dashboard.py`, `tests/test_dashboard.py`.
- **API Endpoints**: `GET /api/dashboard/stats`.
- **Database Impact**: None (pure query read operations with indexes).
- **Security Considerations**: Scoped strictly to `user_id = current_user.id`; zero data leakage across tenants.
- **Tests**: 16 Pytest tests in `tests/test_dashboard.py` covering timeline continuity, overdue counts, and metrics accuracy.
- **Result**: COMPLETE — 16/16 tests passed.

---

## Stage 7 — Settings & Supabase Logo Storage

- **Objective**: Implement business profile management, currency preferences, invoice defaults, and merchant logo uploads to Supabase Storage.
- **Architecture**: Supabase Storage REST SDK client with Pillow image verification; logo metadata persisted in `business_settings`.
- **Files Created**: `app/models/business_settings.py`, `app/schemas/settings.py`, `app/services/settings.py`, `app/services/storage.py`, `app/api/settings.py`, `tests/test_settings.py`.
- **API Endpoints**: `GET /api/settings`, `PUT /api/settings`, `POST /api/settings/logo`, `DELETE /api/settings/logo`.
- **Database Impact**: *Backend Stage 7 required no new migration because the existing `business_settings` schema already supported the required fields (`logo_url`, `currency`, `invoice_prefix`, `default_tax_percentage`, `default_payment_terms_days`).*
- **Security Considerations**: File size capped at 2 MB; MIME verification for PNG/JPEG/WEBP; Pillow header parsing prevents executable image exploits; storage paths isolated per user.
- **Tests**: 18 Pytest tests in `tests/test_settings.py` covering profile updates, corrupt file rejection, replacement, and deletion.
- **Result**: COMPLETE — 18/18 tests passed.
