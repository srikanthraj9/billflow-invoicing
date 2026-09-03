# BillFlow — Backend Service

The BillFlow backend is a high-performance REST API built with FastAPI, SQLAlchemy 2.0, PostgreSQL, and Supabase Storage. It serves as the single source of truth for multi-tenant invoice lifecycle management, financial precision calculations, user authentication, and business settings.

---

## Technology Stack

- **Framework**: FastAPI (Python 3.11+)
- **ASGI Server**: Uvicorn
- **ORM / Database Access**: SQLAlchemy 2.0 with PostgreSQL (`psycopg` binary driver)
- **Database Migrations**: Alembic
- **Data Validation & Schemas**: Pydantic v2 & Pydantic-Settings
- **Authentication & Security**: Passlib (Bcrypt) & Python-JOSE (HS256 JWT)
- **File Storage**: Supabase Storage (`billflow-logos` bucket) with Pillow image validation
- **Testing**: Pytest & HTTPX TestClient

---

## Directory Layout

```
backend/
├── alembic/                      # Alembic database migration scripts & versions
│   ├── versions/
│   │   ├── 4c4fa5194993_initial_schema_users_clients_invoices_.py
│   │   └── bb3f22575463_refine_foreign_keys_nullability_and_.py
│   ├── env.py
│   ├── README
│   └── script.py.mako
├── app/
│   ├── api/                      # REST API routes & endpoint definitions
│   │   ├── auth.py               # Registration, login, /me profile
│   │   ├── clients.py            # Multi-tenant Client CRUD & search
│   │   ├── dashboard.py          # Real-time analytics, revenue timeline & KPIs
│   │   ├── deps.py               # FastAPI dependency injection (DB session, JWT auth)
│   │   ├── health.py             # Database connectivity & service health check
│   │   ├── invoices.py           # Invoice CRUD, financial calculations, state transitions
│   │   ├── public.py             # Unauthenticated public invoice portal & payments
│   │   └── settings.py           # Business profile, currency, invoice defaults, logo upload
│   ├── core/                     # Core system configuration & security utilities
│   │   ├── config.py             # Pydantic environment configuration
│   │   ├── database.py           # SQLAlchemy engine & session factory
│   │   ├── finance.py            # Authoritative decimal financial math (ROUND_HALF_UP)
│   │   └── security.py           # Password hashing & JWT generation/decoding
│   ├── models/                   # SQLAlchemy ORM database models
│   │   ├── base.py               # Shared Base and TimestampMixin
│   │   ├── business_settings.py  # User business preferences and logo metadata
│   │   ├── client.py             # Client entity with RESTRICT FK invoice relations
│   │   ├── invoice.py            # Invoice header with status state machine & public token
│   │   ├── invoice_item.py       # Invoice line items with unit rates and quantities
│   │   └── user.py               # User identity & credentials
│   ├── schemas/                  # Pydantic models for request/response serialization
│   │   ├── auth.py
│   │   ├── client.py
│   │   ├── dashboard.py
│   │   ├── invoice.py
│   │   ├── public_invoice.py
│   │   └── settings.py
│   ├── services/                 # Domain business logic & external integrations
│   │   ├── auth.py
│   │   ├── client.py
│   │   ├── dashboard.py
│   │   ├── invoice.py
│   │   ├── public_invoice.py
│   │   ├── settings.py
│   │   └── storage.py            # Supabase Storage client with MIME & dimension validation
│   └── main.py                   # FastAPI application factory & CORS configuration
├── tests/                        # Pytest automated test suites (128 tests)
│   ├── test_auth.py
│   ├── test_clients.py
│   ├── test_dashboard.py
│   ├── test_invoices.py
│   ├── test_public_invoices.py
│   └── test_settings.py
├── .env.example                  # Environment template (committed)
├── alembic.ini                   # Alembic configuration
└── requirements.txt              # Python dependencies
```

---

## Local Setup & Execution

### 1. Prerequisites
- Python 3.11+
- Active PostgreSQL database (e.g. Supabase or local instance)

### 2. Install Dependencies
```bash
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Unix/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in database credentials and secrets:
```bash
cp .env.example .env
```

### 4. Run Database Migrations
```bash
# Apply migrations to head
python -m alembic upgrade head

# Verify current revision
python -m alembic current

# Verify schema synchronization
python -m alembic check
```

### 5. Start Development Server
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive OpenAPI documentation will be accessible at [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs).

---

## Testing & Quality Assurance

Run the complete backend test suite using Pytest:
```bash
python -m pytest -q
```
**Test Coverage**: 128 tests spanning authentication, client isolation, decimal financial math, state machine transitions, public invoice simulation, and logo storage management.
