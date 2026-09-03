# BillFlow

BillFlow is a full-stack, multi-tenant SaaS invoicing platform engineered for freelancers, independent contractors, boutique studios, and consulting agencies. Built with Next.js 16 (React 19) and FastAPI (Python 3.11+), it delivers backend-authoritative decimal financial accuracy, strict tenant isolation, dynamic overdue tracking, merchant branding with Supabase Storage, and unauthenticated public customer invoice portals with simulated payments.

---

## Overview

BillFlow solves the core operational challenges of modern billing and client invoicing:
- **Target Users**: Independent software engineers, creative directors, consultants, boutique agencies, and service providers who need fast, reliable billing without SaaS overhead.
- **Core Problem Solved**: Eliminates floating-point arithmetic errors, client-side total tampering, and manual payment tracking by enforcing authoritative fixed-point decimal math and strict state-machine controls on the backend.
- **Product Capabilities**: Complete invoice lifecycle management from line-item composition, discount/tax calculations, and custom payment terms to client sharing, customer portal viewing, simulated payment settlement, and real-time executive dashboard analytics.

---

## Quick Start (Windows · PowerShell)

For developers who have already configured their environment files, start both development servers in separate PowerShell terminals:

```powershell
# Terminal 1 — Backend
cd Billflow\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 — Frontend
cd Billflow\frontend
npm run dev
```

Then open: [http://localhost:3000](http://localhost:3000)

*(First-time setup? Follow the complete [Windows Setup Guide](#windows-setup-guide) below).*

---

## Features

- **Authentication**: Stateless HS256 JWT session management with bcrypt password hashing (work factor 12) and automatic session clearance on 401.
- **Multi-Tenant Data Isolation**: Every tenant-owned resource (clients, invoices, items, settings) is scoped strictly to the authenticated user's `user_id`.
- **Client Management & Deletion Protection**: Full client CRUD with server-side multi-field search (name, email, company, phone) and `ON DELETE RESTRICT` foreign-key protection for clients with billed invoices.
- **Invoice Creation & Editing**: Dynamic invoice builder supporting drafts, line-item updates, and status transitions.
- **Draft Invoice Actions**: Dedicated draft controls to **Mark as Sent**, **Edit**, and **Delete Draft**, triggering authoritative state machine progression.
- **Dynamic Line Items & Fractional Quantities**: Real-time line item composition supporting fractional hours and units (e.g., `0.5`, `1.5`, `2.25`, `8.75`) with instant calculation previews.
- **Backend-Authoritative Financial Calculations**: All monetary values recalculated server-side using fixed-point `Decimal` arithmetic with `ROUND_HALF_UP` precision to 2 decimal places.
- **Invoice Lifecycle / State Machine**: Deterministic status progression (`draft` ➔ `sent` ➔ `paid`), invalid transition rejection, and terminal immutability for paid invoices.
- **Overdue Detection**: Dynamically evaluated from invoice status and due date, with overdue invoices surfaced consistently across list, detail, dashboard, and public views.
- **Public Customer Invoice Portal**: Cryptographically secure URL-safe public tokens allowing customers to inspect sanitized invoices without logging in.
- **Simulated Payment**: One-click public payment simulation protected by PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) to prevent race conditions.
- **Merchant Business Identity**: Public portals and payment dialogs accurately attribute the receiving merchant name rather than client details.
- **Status Filter Count Badges**: Real-time numerical status badges (`All`, `Draft`, `Sent`, `Paid`, `Overdue`) on invoice directory filter tabs.
- **Dashboard Analytics**: Real-time KPI summaries (Total Earned, Outstanding Balance, Overdue Amount), invoice count metrics, and configurable 1–24 month revenue timelines, with 6- and 12-month views supported.
- **Business Settings & Auto-Defaults**: Merchant profile management, currency preferences (`INR`, `USD`, `EUR`, `GBP`), invoice prefix customization, and automatic default tax/terms inheritance on new invoices.
- **Logo Storage**: Merchant brand logo upload (PNG, JPEG, WEBP) to Supabase Storage with deep binary Pillow image validation and user-scoped storage paths.
- **Print / Save as PDF**: Print-optimized CSS (`@media print`) rendering clean monochrome documents for browser printing or saving as PDF with page-break protection.
- **Responsive UI**: Responsive layouts tested across mobile (375px, 390px), tablet (768px), laptop (1024px), and desktop (1440px) viewports with accessible mobile drawers.
- **Loading, Empty, and Error States**: Shimmer skeleton loaders, accessible empty state illustrations, and typed `ApiError` normalization.

---

## Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16.3.4 (App Router), React 19.2.8 | Client and server components, file-system routing |
| **Frontend Styling** | Tailwind CSS v4, Lucide React, clsx, tailwind-merge | Modern UI design system, accessible icons, responsive layouts |
| **Form & Validation** | React Hook Form, Zod | Client-side form state management and schema validation |
| **Backend Framework** | FastAPI 0.110+, Python 3.11+, Uvicorn | High-performance asynchronous REST API service |
| **ORM & Database Driver**| SQLAlchemy 2.0, psycopg 3 (binary) | Object-relational mapping and connection pooling |
| **Data Validation** | Pydantic v2, Pydantic-Settings | Request/response schemas and environment settings |
| **Database & Migrations**| PostgreSQL (Supabase), Alembic 1.13+ | Relational persistence, schema versioning (`bb3f22575463`) |
| **File Storage** | Supabase Storage (`billflow-logos` bucket) | Merchant branding assets with user path isolation |
| **Security & Cryptography**| bcrypt, PyJWT (HS256), Python `secrets` | Password hashing, JWT token lifecycle, public tokens |
| **Image Verification** | Pillow 10.2+ | Deep binary image header and dimension validation |
| **Automated Testing** | Pytest, HTTPX, Node.js Test Suites (tsx) | 128 Pytest tests + 202 Frontend Integration checks |

---

## Architecture

```text
Browser / Client (Desktop / Mobile)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Next.js 16 Frontend Layer                                   │
│  ├── App Router (13 Static & Dynamic Routes)                │
│  ├── Reusable UI Component Primitives & Domain Features     │
│  ├── Domain Service Layer (auth, client, invoice, etc.)     │
│  └── Central API Client (Bearer Token Interception & Error) │
└─────────────────────────────────────────────────────────────┘
       │
       │ HTTP REST API (JSON)
       │ Authorization: Bearer <JWT> (or Public Unauthenticated)
       ▼
┌─────────────────────────────────────────────────────────────┐
│ FastAPI Backend Service                                     │
│  ├── APIRouters (/api/auth, /api/clients, /api/invoices)    │
│  ├── Dependency Injection (get_db, get_current_user)        │
│  ├── Pydantic v2 Serialization & Response Sanitization      │
│  ├── Authoritative Decimal Finance Engine (ROUND_HALF_UP)   │
│  └── Domain Services with PostgreSQL Row Locks (FOR UPDATE) │
└─────────────────────────────────────────────────────────────┘
       │                                     │
       │ SQLAlchemy 2.0 (psycopg)            │ Supabase Storage SDK
       ▼                                     ▼
┌─────────────────────────┐          ┌─────────────────────────┐
│ PostgreSQL Database     │          │ Supabase Storage Bucket │
│  - users                │          │  - billflow-logos       │
│  - clients              │          │  - users/{id}/logo/     │
│  - invoices             │          └─────────────────────────┘
│  - invoice_items        │
│  - business_settings    │
└─────────────────────────┘
```

### Layer Responsibilities
- **Next.js Frontend**: Renders responsive UI components, manages client-side routing, and provides calculation previews in invoice builders.
- **Frontend Service Layer**: Decouples UI components from HTTP protocols, normalizing backend snake_case schemas into typed camelCase models.
- **Central API Client**: Centralizes request dispatching, automatically attaches `Authorization: Bearer <token>` for protected endpoints, supports unauthenticated public calls, and clears sessions on 401.
- **FastAPI Backend**: Validates incoming schemas, resolves tenant identity via JWT, executes business rules, and computes authoritative financials.
- **PostgreSQL Database**: Guarantees ACID compliance, foreign-key integrity (`RESTRICT` on clients, `CASCADE` on line items), and atomic row locks.
- **Supabase Storage**: Stores merchant logo assets with isolated tenant directories and binary Pillow validation.

---

## Repository Structure

```text
BillFlow/
├── backend/                      # FastAPI Python Backend Service
│   ├── alembic/                  # Alembic database migration versions
│   │   ├── versions/             # Migration revision scripts (head: bb3f22575463)
│   │   ├── env.py                # Alembic environment runner
│   │   └── alembic.ini           # Alembic configuration
│   ├── app/                      # Application source code
│   │   ├── api/                  # REST API routes (auth, clients, invoices, public, settings, dashboard)
│   │   ├── core/                 # Config, database engine, decimal math, security
│   │   ├── models/               # SQLAlchemy ORM entities (User, Client, Invoice, InvoiceItem, Settings)
│   │   ├── schemas/              # Pydantic validation & response models
│   │   ├── services/             # Domain business logic & Supabase storage
│   │   └── main.py               # FastAPI application entrypoint & CORS middleware
│   ├── tests/                    # 128 Pytest automated test suites
│   ├── .env.example              # Backend environment template (committed)
│   ├── requirements.txt          # Python dependencies
│   └── README.md                 # Backend service guide
│
├── frontend/                     # Next.js 16 / React 19 Frontend Application
│   ├── src/                      # Application source code
│   │   ├── app/                  # Next.js App Router routes & layouts
│   │   │   ├── clients/          # /clients, /clients/new, /clients/[id]/edit
│   │   │   ├── invoices/         # /invoices, /invoices/new, /invoices/[id], /invoices/[id]/edit
│   │   │   ├── dashboard/        # /dashboard
│   │   │   ├── login/            # /login
│   │   │   ├── signup/           # /signup
│   │   │   ├── settings/         # /settings
│   │   │   └── public/           # /public/invoice/[token]
│   │   ├── components/           # UI primitives, auth, clients, invoices, dashboard, settings, landing
│   │   └── lib/                  # Application library (api-client, auth-token, services, types, utils)
│   ├── tests/                    # 202 Integration & Full-Stack QA test suites
│   │   ├── run-all-tests.mjs     # Cross-platform runner executing all 7 suites sequentially
│   │   ├── test-auth-integration.ts
│   │   ├── test-client-integration.ts
│   │   ├── test-invoice-integration.ts
│   │   ├── test-public-invoice-integration.ts
│   │   ├── test-dashboard-integration.ts
│   │   ├── test-settings-integration.ts
│   │   └── test-fullstack-qa.ts
│   ├── public/                   # Static assets & icons
│   ├── .env.example              # Frontend environment template (committed)
│   ├── package.json              # Dependencies and test/dev scripts
│   ├── tsconfig.json             # TypeScript configuration
│   └── next.config.ts            # Next.js build configuration
│
├── docs/                         # Comprehensive Technical Documentation (33 Markdown Files)
│   ├── architecture/             # System architecture, application flows, API specifications
│   ├── frontend/                 # Development stages (1–10), design system, components, data flow
│   ├── backend/                  # Development stages (1–7), API structure, ORM models, data flow
│   ├── testing/                  # Testing strategy, Pytest tests, integration suites, QA report
│   ├── setup/                    # Local development runbook, environment variables, database setup
│   ├── development/              # Project history, development workflow, deployment readiness
│   └── README.md                 # Master documentation index
│
├── tests/                        # Repository-level test documentation & overview
│   └── README.md
│
├── .gitignore                    # Environment secrets protection & build cache rules
└── README.md                     # Root project overview & primary entry point
```

---

## Application Routes

| Route | Type | Description |
| :--- | :---: | :--- |
| `/` | Public | Marketing landing page with hero, features, workflow, and pricing tiers |
| `/login` | Public | User authentication page issuing stateless HS256 JWT tokens |
| `/signup` | Public | User registration page creating tenant accounts and default settings |
| `/dashboard` | Protected | Executive dashboard with KPIs, revenue timeline chart, and recent activity |
| `/clients` | Protected | Client directory with multi-field search and billing statistics |
| `/clients/new` | Protected | Form to create a new client contact record |
| `/clients/[id]/edit` | Protected | Form to update client details with delete protection |
| `/invoices` | Protected | Invoice directory with status filter chips (`All`, `Draft`, `Sent`, `Paid`, `Overdue`) |
| `/invoices/new` | Protected | Invoice builder with dynamic line items, tax, discount, and live preview |
| `/invoices/[id]` | Protected | Detailed invoice sheet with status-aware actions (Mark as Sent, Edit, Share, Print) |
| `/invoices/[id]/edit`| Protected | Edit draft invoices with immutable lock protection for sent/paid invoices |
| `/settings` | Protected | Business profile, branding logo upload, default tax rate, and payment terms |
| `/public/invoice/[token]` | Public | Customer-facing invoice portal with simulated payment settlement |

> [!NOTE]
> Public customer invoice links utilize a cryptographically generated, URL-safe dynamic token (e.g., `/public/invoice/xK9_...`). No hardcoded or static invoice tokens exist in the system.

---

## Invoice Lifecycle & State Machine

```text
[Draft] ───────────────► [Sent] ───────────────► [Paid] (Terminal & Immutable)
   │                       │                       ▲
   │ (Allowed)             │ (Due Date < Today)    │
   ▼                       ▼                       │
[Deleted]              [Overdue] ──────────────────┘
```

- **Draft**: Invoices are fully editable; line items and dates can be modified; draft deletion is permitted. Public portal access returns `404 Not Found`.
- **Sent**: Dispatched to client; protected against deletion (returns `400 Bad Request`); cannot transition back to `draft`.
- **Overdue**: Dynamically evaluated from invoice status and due date, with overdue invoices surfaced consistently across list, detail, dashboard, and public views.
- **Paid**: Terminal state; stamped with authoritative `paid_at` timestamp. Line items, totals, notes, client reference, and status are completely immutable against further modification or deletion.

---

## Authoritative Financial Calculations

All monetary amounts are calculated authoritatively on the backend using Python's `decimal.Decimal` module with strict `ROUND_HALF_UP` rounding to 2 decimal places (`Decimal('0.01')`):

```text
Line Item Amount = ROUND_HALF_UP(Quantity × Unit Rate)
Subtotal         = Sum(Line Item Amounts)
Taxable Base     = Max(0.00, Subtotal - Discount Amount)
Tax Amount       = ROUND_HALF_UP(Taxable Base × (Tax Percentage / 100))
Total Amount     = Taxable Base + Tax Amount
```

### Anti-Tampering Principle
The backend recalculates authoritative financial values rather than trusting client-submitted totals. If a client payload submits manipulated values (e.g. `subtotal: 10, total_amount: 10`), the backend completely ignores them, computes verified values, and persists only its own authoritative totals.

---

## Authentication & Security

- **Password Hashing**: Implemented using bcrypt password hashing with work factor 12 (`bcrypt.hashpw` / `bcrypt.checkpw`). Password hashes are never exposed in API responses.
- **Stateless JWT**: Tokens signed via HMAC-SHA256 (`HS256`) using PyJWT, embedding subject identity (`sub: user_id`) and UTC expiration (`exp`).
- **Token Expiration**: Access tokens expire automatically (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`). Corrupted or expired tokens trigger automatic `401 Unauthorized` and client-side session cleanup.
- **Authenticated User Resolution**: FastAPI dependency (`deps.get_current_user`) decodes Bearer tokens and extracts authenticated `User` models for protected routes.
- **Tenant-Scoped Queries**: Every tenant-owned resource is scoped to the authenticated user's `user_id`. Queries execute `WHERE entity.user_id == current_user.id`.
- **Cross-Tenant Protection**: Attempting to view, modify, or delete another user's client or invoice returns `404 Not Found`.
- **Public Token Security**: Cryptographically secure URL-safe public invoice tokens generated using Python's `secrets` module (`secrets.token_urlsafe(32)`).
- **Public Response Privacy**: Responses explicitly strip internal database UUIDs (`id`, `user_id`, `client_id`, `item_id`) and public token references. Draft invoices return `404 Not Found`.
- **Payment Row Locking**: PostgreSQL `SELECT ... FOR UPDATE` row-level locks prevent race conditions and duplicate settlements during concurrent payment attempts.
- **Logo Upload Validation**: Strict 2 MB file size caps, MIME verification (`image/png`, `image/jpeg`, `image/webp`), and deep binary Pillow image parsing to validate image structure, dimensions, and supported formats.
- **Environment Secrets**: Backend secrets (`DATABASE_URL`, `JWT_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are kept strictly within `backend/.env` and are never exposed to the frontend or version control.

---

## Database

- **Database Engine**: PostgreSQL hosted via Supabase.
- **ORM**: SQLAlchemy 2.0 with PostgreSQL `psycopg` binary driver.
- **Schema Migrations**: Managed deterministically through Alembic.
- **Current Migration Head**: `bb3f22575463`
- **Schema Synchronization**: Confirmed via `alembic check` with zero pending operations.

### Tables & Relationships
- **`users`**: Root tenant accounts. Cascades deletion to owned `business_settings`, `clients`, and `invoices`.
- **`business_settings`**: One-to-one relationship with `users` (`user_id` FK, `CASCADE`).
- **`clients`**: One-to-many relationship with `users` (`user_id` FK, `CASCADE`).
- **`invoices`**: One-to-many relationship with `users` (`user_id` FK, `CASCADE`). References `clients` via `client_id` with **`ON DELETE RESTRICT`**, preventing the accidental deletion of clients with billed invoice history.
- **`invoice_items`**: One-to-many relationship with `invoices` (`invoice_id` FK, `CASCADE`). Deleting a draft invoice automatically cascades to its line items.

---

## API Overview

| Group | Path | Auth | Purpose |
| :--- | :--- | :---: | :--- |
| **Health** | `GET /api/health` | Public | System status and database connectivity check |
| **Auth** | `POST /api/auth/register` | Public | Register new merchant account |
| **Auth** | `POST /api/auth/login` | Public | Authenticate credentials and issue HS256 JWT |
| **Auth** | `GET /api/auth/me` | Bearer JWT | Retrieve authenticated user profile |
| **Clients** | `GET /api/clients` | Bearer JWT | List clients with search (`?search=`), pagination |
| **Clients** | `POST /api/clients` | Bearer JWT | Create client record |
| **Clients** | `GET /api/clients/{id}` | Bearer JWT | Retrieve client by UUID |
| **Clients** | `PUT /api/clients/{id}` | Bearer JWT | Update client contact details |
| **Clients** | `DELETE /api/clients/{id}` | Bearer JWT | Delete client (fails with 409 if invoices exist) |
| **Invoices** | `GET /api/invoices` | Bearer JWT | List invoices with status filter, search, sort |
| **Invoices** | `POST /api/invoices` | Bearer JWT | Create invoice with dynamic line items & decimal math |
| **Invoices** | `GET /api/invoices/{id}` | Bearer JWT | Retrieve invoice with items and client details |
| **Invoices** | `PUT /api/invoices/{id}` | Bearer JWT | Update invoice or execute state transition |
| **Invoices** | `DELETE /api/invoices/{id}` | Bearer JWT | Delete invoice (draft status only) |
| **Public** | `GET /api/public/invoices/{token}` | Public | Public sanitized invoice portal for customer view |
| **Public** | `POST /api/public/invoices/{token}/pay` | Public | Settle payment (simulated, protected by row lock) |
| **Dashboard**| `GET /api/dashboard/stats` | Bearer JWT | Retrieve KPIs, overdue metrics, 6/12-mo timeline |
| **Settings** | `GET /api/settings` | Bearer JWT | Fetch business profile and invoice defaults |
| **Settings** | `PUT /api/settings` | Bearer JWT | Update business profile, default tax, terms, currency |
| **Settings** | `POST /api/settings/logo` | Bearer JWT | Upload merchant logo to Supabase Storage |
| **Settings** | `DELETE /api/settings/logo` | Bearer JWT | Delete merchant logo from storage and database |

---

## Windows Setup Guide

This guide is written specifically for **Windows 10 / 11** using **PowerShell** and **VS Code**.

### 1. Prerequisites

Ensure the following tools are installed on your Windows system:
- **Python**: 3.11 or higher
- **Node.js**: 18.17+ or 20+ LTS
- **npm**: 9 or higher
- **Git**: Latest Windows release
- **PostgreSQL / Supabase**: An active PostgreSQL database (e.g. Supabase project)
- **VS Code** (recommended)

Verify your installations in PowerShell:

```powershell
git --version
node --version
npm --version
python --version
```

> [!NOTE]
> All commands below assume you are running **Windows PowerShell** (or PowerShell 7) inside your terminal or VS Code integrated terminal.

---

### 2. Clone and Enter Project

Clone the repository and enter the project directory:

```powershell
git clone https://github.com/srikanthraj9/billflow-invoicing.git
cd billflow-invoicing
```

---

### 3. Backend Setup

Navigate into the backend directory:

```powershell
cd backend
```

Create a dedicated Python virtual environment:

```powershell
python -m venv venv
```

Activate the environment in PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

> [!IMPORTANT]
> Always run `.\venv\Scripts\Activate.ps1` in PowerShell on Windows.  
> **Do NOT run** `source venv/bin/activate` — that command is strictly for macOS/Linux bash shells and will fail in PowerShell.

*(If PowerShell displays a script execution policy error, see the [PowerShell Execution Policy section](#powershell-script-execution-policy) below).*

Upgrade pip and install the backend dependencies:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

---

### 4. Backend Environment Configuration

Copy the example configuration to create your local `.env`:

```powershell
Copy-Item .env.example .env
```

Open `backend/.env` in VS Code (`code .env`) and populate your real configuration values:

```env
# Database Configuration (PostgreSQL / Supabase Transaction Pooler)
DATABASE_URL=postgresql+psycopg://postgres.<your-project>:<your-password>@<your-pooler-host>:5432/postgres
DIRECT_URL=postgresql+psycopg://postgres.<your-project>:<your-password>@<your-pooler-host>:5432/postgres

# JWT Secret Key (Generate a random 64-character hex string)
JWT_SECRET_KEY=<your-secure-random-64-character-hex-key>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Supabase Storage Configuration (Merchant Logos)
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
SUPABASE_STORAGE_BUCKET=billflow-logos
```

> [!WARNING]
> If you encounter `psycopg.OperationalError: failed to resolve host '<pooler-host>'`, your `backend/.env` still contains the template placeholders. You must replace `<your-pooler-host>` and credentials with your actual Supabase database connection string.  
> Never commit `backend/.env` or store real credentials in version control.

---

### 5. Database Migrations

With your virtual environment activated, run Alembic to migrate the database to the latest revision:

```powershell
python -m alembic upgrade head
```

Verify that the database schema is synchronized:

```powershell
python -m alembic check
```

The check should report `No new upgrade operations detected`, confirming the database is current at revision `bb3f22575463`.

---

### 6. Start Backend

Start the FastAPI development server with auto-reload:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **Interactive OpenAPI Documentation**: [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)

**Leave this PowerShell terminal running.**

---

### 7. Frontend Setup

Open a **second PowerShell terminal** window or VS Code split terminal:

```powershell
# If you are in the Billflow root:
cd frontend

# If you were in the backend folder:
cd ..\frontend
```

Install frontend dependencies:

```powershell
npm install
```

Copy the frontend environment template:

```powershell
Copy-Item .env.example .env.local
```

Verify that `frontend/.env.local` points to your local backend API:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

> [!NOTE]
> `NEXT_PUBLIC_API_BASE_URL` is public configuration used by the browser to reach the FastAPI backend. Never place private keys or database credentials in frontend environment files.

---

### 8. Start Frontend

Start the Next.js development server:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

### 9. Dual-Terminal Execution Model

Both services must run simultaneously in their own PowerShell terminals:

```text
PowerShell Terminal 1 (Backend Service)
└── cd backend
    └── python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
        └── Listening on: http://127.0.0.1:8000

PowerShell Terminal 2 (Frontend App)
└── cd frontend
    └── npm run dev
        └── Listening on: http://localhost:3000

Web Browser
└── http://localhost:3000  ──(REST API JSON requests)──►  http://127.0.0.1:8000/api
```

---

### 10. Verify Frontend ↔ Backend Connection

Verify that both services communicate properly:

1. **Verify Backend**:
   ```powershell
   Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/health" -UseBasicParsing
   ```
   Should return `StatusCode: 200` with `{"status":"healthy","database":"connected","version":"1.0.0"}`.

2. **Verify Frontend**:
   Open [http://localhost:3000](http://localhost:3000). Navigate to `/signup`, register a test account, and confirm seamless redirection to the `/dashboard`.

---

### 11. Stopping the Servers

To stop either server, switch to its respective PowerShell terminal window and press:

```text
Ctrl + C
```

---

## Testing (Windows PowerShell)

All tests can be executed directly from Windows PowerShell. Ensure your backend virtual environment is active for Pytest, and ensure the FastAPI server is running on port 8000 when running frontend integration tests.

### Backend Automated Tests (128 Tests)
```powershell
cd Billflow\backend
.\venv\Scripts\Activate.ps1
python -m pytest -q
```
**Verified Baseline**: `128 passed` across authentication, client CRUD, invoice math, public portal, dashboard, and settings.

### Frontend Integration Suites (202 Checks)
*Requires the backend service to be running on port 8000.*

```powershell
cd Billflow\frontend

# Run all 7 integration test suites sequentially:
npm test

# Or run individual test suites:
npm run test:auth          # Stage 8A: Auth & Bearer Tokens (15 checks)
npm run test:clients       # Stage 8B: Client CRUD & Search (21 checks)
npm run test:invoices      # Stage 8C: Invoice Calculations & State Machine (37 checks)
npm run test:public        # Stage 8D: Public Portal & Payment Simulation (27 checks)
npm run test:dashboard     # Stage 8E: Dashboard KPIs & Revenue Timeline (25 checks)
npm run test:settings      # Stage 8F: Settings & Logo Storage (39 checks)
npm run test:fullstack     # Stage 8G: Full-Stack End-to-End QA (38 checks)
```
**Verified Baseline**: `202 / 202 passed` across all 7 suites (0 failures).

### Static Analysis & Production Build
```powershell
cd Billflow\frontend

# TypeScript type check:
npx tsc --noEmit

# ESLint code quality check:
npm run lint

# Production build compilation:
npm run build
```

### Combined Verification Summary
- **Backend Tests**: 128 / 128 passed
- **Frontend Integration Checks**: 202 / 202 passed
- **Combined Automated Checks**: 330 / 330 passed
- **TypeScript Errors**: 0
- **ESLint Errors**: 0
- **Production Build**: PASS (all 13 application routes compiled successfully)

---

## Windows Troubleshooting & PowerShell Guide

### PowerShell Script Execution Policy
**Symptom**:
```text
.\venv\Scripts\Activate.ps1 : File cannot be loaded because running scripts is disabled on this system.
```
**Cause**: Windows PowerShell restricts script execution by default (`Restricted` policy).  
**Solution**: Grant script execution permission for your current user account only:
```powershell
Get-ExecutionPolicy -Scope CurrentUser
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
This safely allows local scripts to execute without weakening system-wide security.

---

### `source` is not recognized
**Symptom**:
```text
source : The term 'source' is not recognized as the name of a cmdlet, function, script file...
```
**Cause**: `source` is a Linux/macOS command.  
**Solution**: In Windows PowerShell, activate the virtual environment with:
```powershell
.\venv\Scripts\Activate.ps1
```

---

### Port 8000 Already in Use (`WinError 10013` or Address In Use)
**Symptom**:
```text
[Errno 10013] error while attempting to bind on address ('127.0.0.1', 8000)
```
**Cause**: Another process (e.g. an earlier Uvicorn instance) is already listening on port 8000.  
**Solution**:
1. Identify the Process ID (PID) occupying port 8000:
   ```powershell
   netstat -ano | findstr :8000
   ```
2. Inspect what application owns that PID:
   ```powershell
   tasklist /FI "PID eq <PID>"
   ```
3. If it is a stale Python or Uvicorn process, terminate it:
   ```powershell
   taskkill /PID <PID> /F
   ```
*(Never terminate system or unknown processes. Alternatively, you can run Uvicorn on another port like `8001`, but you must update `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` to match).*

---

### Host Resolution Failure (`<pooler-host>`)
**Symptom**:
```text
sqlalchemy.exc.OperationalError: (psycopg.OperationalError) failed to resolve host '<pooler-host>'
```
**Cause**: Your `backend/.env` still contains the unconfigured placeholder hostname `<pooler-host>`.  
**Solution**: Open `backend/.env` and replace `DATABASE_URL` and `DIRECT_URL` with your actual Supabase connection string.

---

### ModuleNotFoundError: No module named 'fastapi'
**Symptom**:
```text
ModuleNotFoundError: No module named 'fastapi'
```
**Cause**: Your virtual environment is not activated, or dependencies were not installed into the virtual environment.  
**Solution**:
```powershell
cd Billflow\backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

---

### `npm` or `node` is not recognized
**Symptom**:
```text
npm : The term 'npm' is not recognized...
```
**Cause**: Node.js is not installed or its installation directory is not added to the Windows system `PATH` environment variable.  
**Solution**: Download and install the latest Node.js LTS release from [nodejs.org](https://nodejs.org), and restart PowerShell.

---

### Frontend Cannot Connect to Backend API
**Symptom**: Network error in browser console, or `Unable to load dashboard data` on frontend.  
**Solution**:
1. Confirm the backend is running and healthy:
   ```powershell
   Invoke-WebRequest http://127.0.0.1:8000/api/health
   ```
2. Verify `frontend/.env.local` contains:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
   ```
3. If you modified `.env.local`, restart Next.js (`Ctrl + C` then `npm run dev`).

---

## Deployment Notes

- **Application Status**: The codebase is fully verified, regression-tested, and **READY FOR PRODUCTION DEPLOYMENT**. Actual hosting deployment has not yet been performed.
- **Frontend Hosting**: Ready for deployment to Vercel, Cloudflare Pages, or Node.js containers.
- **Backend Hosting**: Ready for deployment to Render, Railway, Fly.io, or AWS ECS.
- **Production CORS**: Update `allow_origins` in `backend/app/main.py` with your exact production domain prior to deployment.
- **Supabase Storage**: Ensure the `billflow-logos` bucket exists in your production Supabase project and is configured with public read access.

---

## Documentation

Comprehensive technical documentation is maintained under [`docs/`](./docs/README.md):
- **Architecture**: [System Architecture](./docs/architecture/system-architecture.md) · [Application Flow](./docs/architecture/application-flow.md) · [API Architecture](./docs/architecture/api-architecture.md)
- **Frontend**: [Development Stages](./docs/frontend/development-stages.md) · [Design System](./docs/frontend/design-system.md) · [Component Architecture](./docs/frontend/component-architecture.md) · [Data Flow](./docs/frontend/data-flow.md)
- **Backend**: [Development Stages](./docs/backend/development-stages.md) · [API Structure](./docs/backend/api-structure.md) · [Database Models](./docs/backend/database-models.md) · [Data Flow](./docs/backend/data-flow.md)
- **Testing**: [Test Strategy](./docs/testing/test-strategy.md) · [Backend Tests](./docs/testing/backend-tests.md) · [Frontend Tests](./docs/testing/frontend-tests.md) · [Security Tests](./docs/testing/security-tests.md) · [Stage 8G QA Report](./docs/testing/qa-report.md)
- **Setup & Runbook**: [Local Development Runbook](./docs/setup/getting-started.md) · [Environment Variables](./docs/setup/environment.md) · [Database Setup](./docs/setup/database-setup.md)
- **Operations**: [Project History](./docs/development/project-history.md) · [Development Workflow](./docs/development/development-workflow.md) · [Deployment Operations Runbook](./docs/development/deployment-readiness.md)

---

## Project Status

All automated regression tests, static analysis checks, and production compilation builds have passed. The application codebase is **READY FOR PRODUCTION DEPLOYMENT**.
