# BillFlow Local Development Guide

This runbook provides the complete step-by-step developer walkthrough for onboarding, installing, configuring, testing, building, and running BillFlow locally.

---

## 1. Prerequisites

Before starting, ensure the following runtimes and tools are installed:
- **Node.js**: v18.17+ or v20+ (LTS recommended)
- **npm**: v9+
- **Python**: 3.11+
- **PostgreSQL**: Local PostgreSQL 14+ or cloud instance (Supabase)
- **Git**: v2.30+

---

## 2. Clone the Repository

```bash
git clone https://github.com/your-username/billflow.git
cd billflow
```

---

## 3. Backend Setup

```bash
cd backend

# 1. Create and activate a Python virtual environment:
python -m venv venv

# On Windows (PowerShell / Command Prompt):
.\venv\Scripts\activate

# On macOS / Linux:
source venv/bin/activate

# 2. Install required Python packages:
pip install -r requirements.txt

# 3. Configure environment variables:
cp .env.example .env
# Edit .env and supply DATABASE_URL, JWT_SECRET_KEY, and SUPABASE credentials.

# 4. Apply database migrations to head revision:
python -m alembic upgrade head

# 5. Start the FastAPI development server:
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 4. Frontend Setup

In a new terminal window:
```bash
cd frontend

# 1. Install Node.js dependencies:
npm install

# 2. Configure frontend environment variables:
cp .env.example .env.local
# Verify NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api

# 3. Start Next.js development server:
npm run dev
```

---

## 5. Verify Backend

Open your browser or terminal to verify backend service health:
```bash
curl http://127.0.0.1:8000/api/health
```
**Expected Response**:
```json
{"status":"healthy","database":"connected","version":"1.0.0"}
```
Interactive OpenAPI documentation is available at [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs).

---

## 6. Verify Frontend

Open [http://localhost:3000](http://localhost:3000) in your browser. The high-converting marketing landing page should display with interactive previews and working navigation buttons.

---

## 7. Run Backend Tests

Run all 128 Pytest tests:
```bash
cd backend
python -m pytest -q
```
**Expected Result**: `128 passed`

---

## 8. Run Frontend Integration Tests

*Ensure the backend is running at http://127.0.0.1:8000.*
```bash
cd frontend

# Run individual suites:
npm run test:auth
npm run test:clients
npm run test:invoices
npm run test:public
npm run test:dashboard
npm run test:settings

# Or run all 7 suites sequentially:
npm test
```
**Expected Result**: `202 / 202 passed`

---

## 9. Run Full-Stack QA

Execute the comprehensive end-to-end multi-tenant regression audit:
```bash
cd frontend
npm run test:fullstack
```
**Expected Result**: `38 / 38 passed`

---

## 10. Production Build

Verify production bundle compilation:
```bash
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```
**Expected Result**: 12 static and dynamic application routes compiled cleanly with zero errors.

---

## 11. Production Start

Start and verify the optimized production server:
```bash
cd frontend
npm run start
```
Verify responses:
```bash
curl -I http://localhost:3000/
# Expected: HTTP/1.1 200 OK
```

---

## 12. Troubleshooting

### Issue 1: Missing Environment Variables
- **Symptom**: Backend crashes on startup with `pydantic_core._pydantic_core.ValidationError: 1 validation error for Settings`.
- **Fix**: Check `backend/.env`. Ensure required keys (`DATABASE_URL`, `JWT_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are defined and not blank.

### Issue 2: Database Connection Refused
- **Symptom**: `health` reports database disconnected or `psycopg.OperationalError: connection refused`.
- **Fix**: Verify PostgreSQL is running on host/port specified in `DATABASE_URL`. If using Supabase, ensure your IP is not blocked and check if the database was paused due to inactivity.

### Issue 3: Migration Status Out of Sync
- **Symptom**: Alembic raises `Target database is not up to date`.
- **Fix**: Run `python -m alembic current` to view current revision, then `python -m alembic upgrade head` to align with revision `bb3f22575463`.

### Issue 4: Backend Unavailable / Connection Refused from Frontend
- **Symptom**: Frontend displays `"Unable to connect to the server"` or `ERR_CONNECTION_REFUSED`.
- **Fix**: Confirm Uvicorn is active on `127.0.0.1:8000`. Test directly with `curl http://127.0.0.1:8000/api/health`.

### Issue 5: Incorrect Frontend API URL
- **Symptom**: Network inspector in browser shows requests failing to `undefined/auth/login` or `404`.
- **Fix**: Verify `frontend/.env.local` contains `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api`. Next.js requires a restart after modifying `.env.local`.

### Issue 6: Supabase Storage Logo Upload Failure
- **Symptom**: Logo upload returns 400 or 500 when uploading valid images.
- **Fix**: Confirm that the bucket `billflow-logos` exists in your Supabase project under Storage and is marked Public. Ensure `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env` is the `service_role` secret (not the `anon` public key).
