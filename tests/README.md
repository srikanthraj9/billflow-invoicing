# BillFlow — Automated Verification & Test Suites

The BillFlow test architecture provides comprehensive, layered regression coverage across backend business logic, database transactions, financial accuracy, API contracts, multi-tenant isolation, and frontend service integration.

---

## Test Architecture

```
BillFlow/
├── backend/
│   └── tests/                     # 128 Pytest suites (Backend API, Core Math, Models, Storage)
│       ├── test_auth.py           # Registration, password hashing, JWT validation
│       ├── test_clients.py        # Multi-tenant client CRUD, search, RESTRICT FKs
│       ├── test_dashboard.py      # Real-time metrics, dynamic overdue, monthly revenue
│       ├── test_invoices.py       # Line items, ROUND_HALF_UP decimal math, state machine
│       ├── test_public_invoices.py# Public token privacy, simulated payment, idempotency
│       └── test_settings.py       # Profile updates, invoice defaults, Supabase logo storage
└── frontend/
    └── tests/                     # 202 Integration & Full-Stack QA checks
        ├── run-all-tests.mjs      # Cross-platform runner executing all 7 suites sequentially
        ├── test-auth-integration.ts           # Stage 8A: Auth lifecycle & Bearer tokens (15 checks)
        ├── test-client-integration.ts         # Stage 8B: Client CRUD & tenant isolation (21 checks)
        ├── test-invoice-integration.ts        # Stage 8C: Invoices, math & state transitions (37 checks)
        ├── test-public-invoice-integration.ts # Stage 8D: Public portal & simulated payment (27 checks)
        ├── test-dashboard-integration.ts      # Stage 8E: Analytics, timeline & overdue KPIs (25 checks)
        ├── test-settings-integration.ts       # Stage 8F: Settings, logo storage & defaults (39 checks)
        └── test-fullstack-qa.ts               # Stage 8G: Full-system end-to-end audit (38 checks)
```

---

## Running Tests

### 1. Backend Pytest Suites (128 Tests)
```bash
cd backend
python -m pytest -q
```

### 2. Frontend Integration & Full-Stack QA Suites (202 Checks)
*Ensure the FastAPI backend server is running at `http://127.0.0.1:8000/api` before running integration tests.*

```bash
cd frontend

# Run all 7 suites sequentially via cross-platform runner:
npm test
# or:
npm run test:all

# Or run individual integration suites:
npm run test:auth
npm run test:clients
npm run test:invoices
npm run test:public
npm run test:dashboard
npm run test:settings
npm run test:fullstack
```

---

## Quality Metrics & Verification

For detailed test matrices, security verification results, and regression history, refer to:
- [Testing Strategy & QA Report](../docs/testing/qa-report.md)
- [System Architecture](../docs/architecture/system-architecture.md)
