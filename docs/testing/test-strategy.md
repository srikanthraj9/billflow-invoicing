# BillFlow — Testing Strategy & Quality Assurance Architecture

BillFlow employs a defense-in-depth testing strategy spanning static type checking, unit tests, API contracts, integration suites, security assertions, and end-to-end full-stack audits.

---

## 1. Testing Pyramid

```
                       ┌─────────────────────────┐
                       │  Full-Stack QA (Stage 8G)│  (38 E2E Checks)
                       ├─────────────────────────┤
                       │  Frontend Integration   │  (164 Checks across 8A-8F)
                       ├─────────────────────────┤
                       │  Backend Pytest Suites  │  (128 Tests across 6 Modules)
                       ├─────────────────────────┤
                       │ Database & Alembic Check│  (Zero Drift, Revision Head)
                       ├─────────────────────────┤
                       │ Static Checks (TSC/Lint)│  (0 Errors, Clean Build)
                       └─────────────────────────┘
```

---

## 2. Testing Layers & Scopes

### 2.1 Static Type Analysis & Linting
- **TypeScript (`npx tsc --noEmit`)**: Validates type safety across all components, hooks, services, and types. Zero errors permitted.
- **ESLint (`npm run lint`)**: Enforces code style, unused variables, and React best practices. Zero errors permitted.

### 2.2 Backend Unit & API Testing (`backend/tests/`)
- Uses **Pytest** with HTTPX `TestClient` against a dedicated test database.
- Database transactions roll back between tests to ensure test isolation.
- Validates model constraints, password salting, JWT tokens, decimal financial math (`ROUND_HALF_UP`), status state transitions, and file upload validations.

### 2.3 Frontend Integration Testing (`frontend/tests/`)
- TypeScript scripts run with `tsx` to test the frontend service layer against the running FastAPI backend.
- Simulates real browser environments with `localStorage` polyfills and fetch calls.
- Validates token storage, automatic Bearer header attachment, error normalization, and response mapping.

### 2.4 Full-Stack End-to-End QA (Stage 8G)
- The unified `test-fullstack-qa.ts` script executes 38 end-to-end scenarios covering the entire user journey:
  1. Signup & weak credential rejection
  2. Multi-tenant isolation between User A and User B
  3. Client CRUD with `RESTRICT` foreign key enforcement
  4. Financial math precision and tampering prevention
  5. State machine transitions and paid invoice immutability
  6. Dynamic overdue status evaluation
  7. Public invoice viewing and simulated payment with row locks
  8. Business settings and invoice defaults inheritance
  9. Real-time dashboard KPI consistency

### 2.5 Database Schema & Migration Verification
- **`alembic current`**: Verifies that the live database is at the latest revision `bb3f22575463 (head)`.
- **`alembic check`**: Verifies that SQLAlchemy models and the physical database schema are in 100% synchronization with zero undetected drift.

### 2.6 Security & Penetration Testing
- Evaluates cross-tenant data access (User B attempting to view, edit, or delete User A's data).
- Validates that internal database UUIDs are never leaked to public endpoints.
- Confirms password hashes are never exposed in user API responses.
- Asserts that double-payment race conditions are prevented via atomic database row locks.

### 2.7 Production Build Verification
- **`npm run build`**: Compiles all 12 Next.js App Router routes into optimized production bundles, validating server-side rendering, static generation, and bundle size.

### 2.8 Responsive Viewport Testing
- Visual and functional audits conducted across standard viewports:
  - 375px & 390px (Mobile S/M)
  - 768px (Tablet)
  - 1024px (Laptop)
  - 1440px (Desktop / Ultrawide)
