# BillFlow — System Architecture

BillFlow is architected as a modern, decoupled client-server web application designed for high security, financial precision, and strict multi-tenant isolation.

---

## 1. System Topology & Component Hierarchy

```
User (Browser / Mobile)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend Layer (Next.js 16 / React 19)                    │
│    ├── App Router (12 Pages / Routes)                       │
│    ├── UI Primitives & Feature Components                   │
│    ├── Domain Services (auth, client, invoice, etc.)        │
│    └── Central API Client (JWT Interception & Token Cache)  │
└─────────────────────────────────────────────────────────────┘
       │
       │ HTTP / HTTPS (REST API JSON)
       │ Authorization: Bearer <JWT> (or Unauthenticated for Public)
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Backend REST API Layer (FastAPI / Python 3.11+)          │
│    ├── Route Handlers (/api/auth, /api/invoices, etc.)       │
│    ├── Dependency Injection (get_db, get_current_user)      │
│    ├── Schema Validation (Pydantic v2)                      │
│    ├── Authoritative Decimal Financial Engine               │
│    └── Domain Service Layer (Client, Invoice, Dashboard)    │
└─────────────────────────────────────────────────────────────┘
       │                                     │
       │ SQLAlchemy 2.0 (psycopg)            │ Supabase SDK
       ▼                                     ▼
┌─────────────────────────┐          ┌─────────────────────────┐
│ 3. Relational Database  │          │ 4. Media & File Storage │
│    PostgreSQL (Supabase)│          │    Supabase Storage     │
│    - users              │          │    - Bucket:            │
│    - clients            │          │      billflow-logos     │
│    - invoices           │          │    - User isolation:    │
│    - invoice_items      │          │      users/{id}/logo/   │
│    - business_settings  │          └─────────────────────────┘
└─────────────────────────┘
```

---

## 2. Responsibilities of Each Layer

### 2.1 Frontend Layer (`frontend/`)
- **Presentation & Interaction**: Renders accessible, high-performance UI using React 19 Server/Client components and Tailwind CSS v4.
- **Client-Side Routing**: Next.js App Router powers 12 application routes with seamless navigation and deep link preservation.
- **Domain Service Layer**: Decouples UI components from HTTP details. Services like `invoiceService` and `clientService` encapsulate entity operations.
- **Central API Client (`src/lib/api-client.ts`)**: Singleton HTTP wrapper that handles request serialization, automatic JWT token attachment, 401 response handling, and error wrapping into typed `ApiError` instances.
- **Optimistic Display & Draft Math**: Provides instant interactive calculations in form editors while relying completely on backend responses as the source of truth.

### 2.2 Backend REST API Layer (`backend/app/`)
- **API Routing & Parameter Validation**: FastAPI route handlers validate incoming JSON bodies and query parameters via Pydantic v2 models.
- **Security & Multi-Tenancy**: The `get_current_user` dependency validates JWT tokens and automatically scopes all database operations to `WHERE user_id = current_user.id`.
- **Domain Business Logic**: Encapsulates business rules (e.g. invoice status state machines, RESTRICT client deletion checks, continuous 6/12-month timeline aggregation).
- **Authoritative Decimal Financial Engine**: Calculates line-item totals, subtotals, discounts, taxes, and final balances using Python's `decimal.Decimal` with `ROUND_HALF_UP` rounding.

### 2.3 Relational Persistence Layer (PostgreSQL)
- **ACID Transactions**: Guarantees atomic invoice creation with line items and safe concurrent state updates.
- **Referential Integrity**: Enforces `ON DELETE CASCADE` for parent-child relations and `ON DELETE RESTRICT` between clients and invoices to prevent accidental orphan states.
- **Alembic Versioning**: All schema alterations are version-controlled and applied deterministically up to head revision `bb3f22575463`.

### 2.4 Media & File Storage Layer (Supabase Storage)
- **Merchant Logo Hosting**: Stores uploaded branding logos in the public `billflow-logos` bucket.
- **Deep Image Verification**: Pillow 10.2+ validates file headers, MIME types, and dimensions to prevent arbitrary file upload vulnerabilities.
- **Path Isolation**: Files are segregated per user at `users/{user_id}/logo/{uuid}.{ext}`.

---

## 3. Public Invoice & Simulated Payment Subsystem

```
Customer Browser
       │
       │ GET /public/invoice/{token}
       ▼
Next.js Public Page (/public/invoice/[token])
       │
       │ GET /api/public/invoices/{token} (No Auth Header)
       ▼
FastAPI Public Router (/api/public.py)
       │
       │ Fetch by public_token (WHERE status != 'draft')
       ▼
Sanitize Response (Remove internal UUIDs & tokens)
       │
       ▼
Display Invoice to Customer
       │
       │ Customer clicks "Pay Now"
       │ POST /api/public/invoices/{token}/pay
       ▼
FastAPI Public Payment Handler
       │
       │ Atomic Row Lock: SELECT ... FOR UPDATE
       │ Validate status == 'sent' or 'overdue'
       │ Update status = 'paid', paid_at = NOW()
       ▼
Commit Transaction & Return Paid Confirmation
```

- **Zero Authentication Required**: Customers view and pay invoices without creating accounts.
- **Cryptographic URL Token**: Invoices are addressed via a 32-byte URL-safe cryptographic token (`secrets.token_urlsafe(32)`), guaranteeing high entropy (~256 bits).
- **Privacy Sanitization**: The public endpoint response schema strips all internal database primary keys (`id`, `user_id`, `client_id`, `item_id`).
- **Concurrent Settlement Protection**: PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) prevent race conditions and ensure payment idempotency.
