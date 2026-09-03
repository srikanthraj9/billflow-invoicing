# BillFlow — Production Deployment Readiness & Operations Runbook

This runbook guides devops engineers and maintainers through promoting BillFlow from local development to production hosting environments.

> [!IMPORTANT]
> The BillFlow application is **READY FOR PRODUCTION DEPLOYMENT**. All code, database models, tests, builds, and assets are verified. The application is not yet deployed to cloud hosts; this document details what has been verified and what must be executed during hosting setup.

---

## 1. Production Deployment Pipeline

```
LOCAL DEVELOPMENT
       │
       ▼
TESTING & QUALITY GATES (Pytest 128/128, Integration 202/202)
       │
       ▼
PRODUCTION BUILD (TypeScript, ESLint, Next.js 12 Routes)
       │
       ▼
PRODUCTION ENVIRONMENT (Vercel / Render / Supabase)
       │
       ▼
DEPLOY BACKEND (FastAPI on Render / Railway / Fly.io / AWS)
       │
       ▼
DEPLOY FRONTEND (Next.js on Vercel / Cloudflare Pages / Node.js)
       │
       ▼
CONFIGURE CORS (Set ALLOWED_ORIGINS to production frontend domain)
       │
       ▼
CONFIGURE DATABASE (Production PostgreSQL + Alembic upgrade head)
       │
       ▼
CONFIGURE STORAGE (Supabase Storage 'billflow-logos' public bucket)
       │
       ▼
PRODUCTION SMOKE TEST (Health, Login, Invoice Creation, Public Pay)
```

---

## 2. Capabilities Already Verified (ALREADY VERIFIED)

The following capabilities have been tested and proven on the active codebase:

| Verification Check | Status | Verification Evidence |
| :--- | :---: | :--- |
| **Backend Pytest Suites** | **VERIFIED** | 128/128 tests passing across auth, clients, invoices, public portal, dashboard, and settings in 406.81s. |
| **Frontend Integration Suites** | **VERIFIED** | 202/202 checks passing across all 7 suites via `node tests/run-all-tests.mjs`. |
| **Full-Stack QA Audit (8G)** | **VERIFIED** | 38/38 end-to-end multi-tenant regression scenarios verified. |
| **TypeScript Type Checking** | **VERIFIED** | `npx tsc --noEmit` exited with 0 errors. |
| **ESLint Quality Audit** | **VERIFIED** | `npm run lint` exited with 0 errors. |
| **Next.js Production Build** | **VERIFIED** | `npm run build` cleanly compiled all 12 application routes. |
| **Production Server Start** | **VERIFIED** | `npm run start` started successfully and served HTTP 200 on all routes. |
| **Database Schema Revision** | **VERIFIED** | Alembic current at `bb3f22575463 (head)` with 0 drift (`alembic check`). |
| **Authoritative Decimal Finance** | **VERIFIED** | Python `Decimal` + `ROUND_HALF_UP` prevents floating-point rounding errors and rejects client-side tampering. |
| **Multi-Tenant Data Isolation** | **VERIFIED** | User B cannot view, mutate, or delete User A's clients, invoices, settings, or dashboard data. |
| **Public Invoice Privacy** | **VERIFIED** | Public tokens strip internal UUIDs and hide draft invoices. |
| **Concurrent Payment Lock** | **VERIFIED** | PostgreSQL `SELECT ... FOR UPDATE` prevents double-charge race conditions. |
| **Media Storage Validation** | **VERIFIED** | Deep binary verification via Pillow blocks corrupted, oversized, or malicious files. |
| **Repository Hygiene** | **VERIFIED** | No test scripts or mock data in `frontend/src/lib`; secrets protected in `.gitignore`. |

---

## 3. Production Deployment Checklist (MUST BE CONFIGURED DURING DEPLOYMENT)

During the actual deployment phase to hosting infrastructure, complete the following steps:

- [ ] **1. Provision Production Database**:
  - Provision a production PostgreSQL instance (Supabase, AWS RDS, or Render PostgreSQL).
  - Obtain the production transaction pooler connection string (`DATABASE_URL`) and direct string (`DIRECT_URL`).
- [ ] **2. Apply Database Migrations**:
  - Set `DATABASE_URL` in release environment and execute: `python -m alembic upgrade head`.
  - Confirm `python -m alembic current` displays `bb3f22575463 (head)`.
- [ ] **3. Configure Backend Production Environment**:
  - `DATABASE_URL`: Production PostgreSQL connection string.
  - `DIRECT_URL`: Production direct connection string.
  - `JWT_SECRET_KEY`: Generate a cryptographically secure 64-character hex key (`openssl rand -hex 32`).
  - `JWT_ALGORITHM`: `HS256`.
  - `ACCESS_TOKEN_EXPIRE_MINUTES`: Set desired session duration (e.g. `60` or `1440`).
  - `SUPABASE_URL`: Production Supabase project URL.
  - `SUPABASE_SERVICE_ROLE_KEY`: Production Supabase service role secret key.
  - `SUPABASE_STORAGE_BUCKET`: `billflow-logos`.
- [ ] **4. Configure CORS Allowed Origins**:
  - In `backend/app/main.py`, update `allow_origins` to whitelist the production frontend domain (e.g. `https://billflow.app`).
- [ ] **5. Deploy Backend Service**:
  - Deploy to Render / Railway / Fly.io / AWS ECS with command:
    `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - Verify public health check: `GET https://api.yourdomain.com/api/health` returns `200 OK`.
- [ ] **6. Configure Frontend Production Environment**:
  - Set `NEXT_PUBLIC_API_BASE_URL` in Vercel / host dashboard pointing to the live backend:
    `NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api`
- [ ] **7. Deploy Frontend Application**:
  - Deploy Next.js to Vercel / Node.js host.
  - Vercel automatically runs `npm run build` and binds `next start`.
- [ ] **8. Production Smoke Test**:
  - [ ] Register new account on production landing page.
  - [ ] Log in and verify JWT session.
  - [ ] Create a client record.
  - [ ] Generate an invoice with line items, tax, and discount.
  - [ ] Open public invoice link in an incognito window.
  - [ ] Complete simulated payment and verify invoice transitions to `paid`.
  - [ ] Upload business logo and verify public CDN image rendering.
  - [ ] Check executive dashboard KPIs.
