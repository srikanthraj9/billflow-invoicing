# BillFlow — Backend API Structure & Routers

The BillFlow backend organizes its REST endpoints into domain-specific `APIRouter` instances located in `backend/app/api/`. These routers are mounted in `app/main.py` under the `/api` prefix.

---

## 1. Router Organization

```
backend/app/api/
├── auth.py          # /api/auth (User registration, login, session profile)
├── clients.py       # /api/clients (Multi-tenant client CRUD, server search)
├── dashboard.py     # /api/dashboard (Executive KPIs, revenue charts)
├── deps.py          # Dependency injection (Database session & JWT verification)
├── health.py        # /api/health (System diagnostic & database connectivity)
├── invoices.py      # /api/invoices (Invoice builder, transitions, filters)
├── public.py        # /api/public (Unauthenticated portal, simulated payments)
└── settings.py      # /api/settings (Business profile, defaults, logo storage)
```

---

## 2. Router Responsibilities

### 2.1 `auth.py` (`prefix="/api/auth", tags=["auth"]`)
- Handles user registration (`POST /register`), validating credentials and ensuring unique email addresses.
- Authenticates users (`POST /login`) via constant-time password comparison, issuing signed HS256 JWTs.
- Returns the authenticated user profile (`GET /me`) via the `get_current_user` dependency.

### 2.2 `clients.py` (`prefix="/api/clients", tags=["clients"]`)
- Lists clients with optional server-side search (`GET /`) filtering by name, email, company, and phone.
- Creates new clients (`POST /`), associating them with `current_user.id`.
- Retrieves, updates, and deletes clients by UUID.
- Guards against deleting clients referenced by invoices (`ON DELETE RESTRICT`), returning `409 Conflict`.

### 2.3 `invoices.py` (`prefix="/api/invoices", tags=["invoices"]`)
- Lists invoices with status chips, search query, client filter, and sorting (`GET /`).
- Creates new invoices (`POST /`), generating sequential invoice numbers and 32-byte public tokens while computing authoritative decimal math.
- Manages invoice updates (`PUT /{id}`), enforcing the state transition machine (`draft` ➔ `sent` ➔ `paid`).
- Enforces terminal immutability: prohibits edits or status changes on `paid` invoices.
- Deletes draft invoices (`DELETE /{id}`), rejecting deletion requests for `sent` or `paid` records.

### 2.4 `public.py` (`prefix="/api/public", tags=["public"]`)
- Serves unauthenticated public invoice data (`GET /invoices/{token}`), stripping database internal UUIDs and hiding draft invoices.
- Processes simulated customer payments (`POST /invoices/{token}/pay`), utilizing PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) to prevent race conditions.

### 2.5 `dashboard.py` (`prefix="/api/dashboard", tags=["dashboard"]`)
- Aggregates executive KPIs (`GET /stats`): Total Earned, Outstanding Balance, Overdue Amount.
- Computes real-time invoice counts (total, paid, pending, overdue).
- Generates an unbroken 6-month or 12-month revenue timeline for charting.
- Returns the latest 5 invoices for immediate dashboard display.

### 2.6 `settings.py` (`prefix="/api/settings", tags=["settings"]`)
- Retrieves and updates business profile details, currency preferences, invoice prefixes, default tax rates, and payment terms.
- Handles merchant logo uploads (`POST /logo`) with MIME verification, 2 MB size limits, and Pillow image validation before saving to Supabase Storage.
- Deletes logos (`DELETE /logo`) from Supabase Storage and database records.

### 2.7 `health.py` (`prefix="/api", tags=["health"]`)
- Public endpoint (`GET /health`) performing a database connection check (`SELECT 1`) to provide container orchestration and uptime monitoring readiness.

### 2.8 `deps.py` (FastAPI Dependencies)
- `get_db()`: Manages scoped SQLAlchemy sessions with automatic rollback on unhandled errors.
- `get_current_user()`: Validates incoming Bearer JWT tokens and resolves the authenticated `User` model.
