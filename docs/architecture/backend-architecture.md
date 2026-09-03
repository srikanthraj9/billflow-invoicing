# BillFlow — Backend Architecture

The BillFlow backend is a high-performance asynchronous REST API built with **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL**, and **Pydantic v2**. It serves as the single source of truth for all business rules, authentication, and multi-tenant persistence.

---

## 1. Actual Directory Structure

```
backend/
├── alembic/                      # Database schema migrations
│   ├── versions/
│   │   ├── 4c4fa5194993_initial_schema_users_clients_invoices_.py
│   │   └── bb3f22575463_refine_foreign_keys_nullability_and_.py
│   ├── env.py
│   └── alembic.ini
├── app/
│   ├── api/                      # REST API route handlers
│   │   ├── auth.py               # /api/auth (register, login, me)
│   │   ├── clients.py            # /api/clients (CRUD, search)
│   │   ├── dashboard.py          # /api/dashboard/stats (KPIs, timeline)
│   │   ├── deps.py               # Dependency injection (db, current_user)
│   │   ├── health.py             # /api/health (database connectivity)
│   │   ├── invoices.py           # /api/invoices (CRUD, calculations, state)
│   │   ├── public.py             # /api/public/invoices (portal, pay)
│   │   └── settings.py           # /api/settings (preferences, logo upload)
│   ├── core/                     # Core system utilities
│   │   ├── config.py             # Pydantic Settings & environment variables
│   │   ├── database.py           # SQLAlchemy engine & sessionmaker
│   │   ├── finance.py            # Authoritative ROUND_HALF_UP decimal math
│   │   └── security.py           # Passlib bcrypt & JWT token handling
│   ├── models/                   # SQLAlchemy ORM models
│   │   ├── base.py               # DeclarativeBase and TimestampMixin
│   │   ├── business_settings.py  # BusinessSettings entity
│   │   ├── client.py             # Client entity
│   │   ├── invoice.py            # Invoice entity
│   │   ├── invoice_item.py       # InvoiceItem line entity
│   │   └── user.py               # User identity entity
│   ├── schemas/                  # Pydantic v2 validation & response schemas
│   │   ├── auth.py
│   │   ├── client.py
│   │   ├── dashboard.py
│   │   ├── invoice.py
│   │   ├── public_invoice.py
│   │   └── settings.py
│   ├── services/                 # Domain business logic & external SDKs
│   │   ├── auth.py
│   │   ├── client.py
│   │   ├── dashboard.py
│   │   ├── invoice.py
│   │   ├── public_invoice.py
│   │   ├── settings.py
│   │   └── storage.py            # Supabase Storage client & Pillow verification
│   └── main.py                   # FastAPI app factory, CORS, exception handlers
├── tests/                        # 128 Pytest test cases
├── requirements.txt              # Dependencies
└── README.md                     # Backend service guide
```

---

## 2. Request Lifecycle Pipeline

Every API request follows a deterministic pipeline through FastAPI's ASGI stack:

```
HTTP Request (Client)
       │
       ▼
1. CORS & Middleware (`app/main.py`)
       │ Validates Origin, Methods, and Allowed Headers
       ▼
2. APIRouter (`app/api/*.py`)
       │ Matches HTTP Method and URI Route
       ▼
3. Dependency Injection (`app/api/deps.py`)
       ├─► `get_db`: Yields scoped SQLAlchemy database session
       └─► `get_current_user`: Verifies Bearer JWT, decodes 'sub', queries User
       ▼
4. Pydantic Schema Validation (`app/schemas/*.py`)
       │ Validates input payload types, string constraints, and email format
       │ Raises HTTP 422 if payload fails validation
       ▼
5. Domain Service Layer (`app/services/*.py`)
       │ Executes business logic (decimal math, state transitions, storage)
       ▼
6. SQLAlchemy ORM & PostgreSQL (`app/models/*.py`)
       │ Scopes queries: WHERE user_id == current_user.id
       │ Executes ACID transactions / row-level locks
       ▼
7. Pydantic Response Serialization (`app/schemas/*.py`)
       │ Strips sensitive fields (e.g. password_hash, internal UUIDs for public)
       ▼
JSON Response (Client)
```

---

## 3. Core Architectural Subsystems

### 3.1 Security & Token Engine (`app/core/security.py`)
- **Password Hashing**: Passlib with bcrypt algorithm using automatic work factor salting.
- **JWT Generation**: Python-JOSE encodes signed tokens using HMAC-SHA256 (`HS256`).
- **Stateless Verification**: Tokens contain `sub` (user UUID) and `exp` (UTC timestamp). No database session state is needed to authenticate incoming requests.

### 3.2 Authoritative Financial Engine (`app/core/finance.py`)
- Calculates all monetary amounts using Python's standard `decimal.Decimal` module.
- Enforces `ROUND_HALF_UP` quantization (`Decimal('0.01')`) across line item rates, subtotals, tax brackets, and totals.
- Eliminates floating-point discrepancies (`0.1 + 0.2 != 0.3`).

### 3.3 Media Storage Subsystem (`app/services/storage.py`)
- Communicates with Supabase Storage via HTTPS REST API using the backend `SUPABASE_SERVICE_ROLE_KEY`.
- Performs deep binary inspection with Python's `Pillow` library to verify image integrity and bounding dimensions before upload.
- Implements deterministic file deletion on replacement or explicit merchant removal.
