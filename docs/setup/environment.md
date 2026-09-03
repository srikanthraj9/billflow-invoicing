# BillFlow — Environment Variables Reference

This document catalogs all environment variables used by the BillFlow frontend and backend services.

---

## 1. Backend Environment Variables (`backend/.env`)

| Variable Name | Location | Requirement | Purpose | Example Placeholder |
| :--- | :--- | :---: | :--- | :--- |
| `DATABASE_URL` | `backend/.env` | **Required** | PostgreSQL connection string for application runtime queries (connection pooling). | `postgresql+psycopg://postgres:<password>@localhost:5432/billflow` |
| `DIRECT_URL` | `backend/.env` | Optional | Direct connection string bypassing poolers (used for migrations if different). | `postgresql+psycopg://postgres:<password>@localhost:5432/billflow` |
| `JWT_SECRET_KEY` | `backend/.env` | **Required** | Secret 256-bit cryptographic key for signing and verifying HS256 JWT tokens. | `<your-64-character-hex-secret-key>` |
| `JWT_ALGORITHM` | `backend/.env` | Optional | Algorithm used for JWT encoding. Defaults to `HS256`. | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| `backend/.env` | Optional | Lifetime of an access token in minutes. Defaults to `60`. | `60` |
| `SUPABASE_URL` | `backend/.env` | **Required** | Base HTTPS URL of your Supabase project for storage SDK. | `https://<your-project-id>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY`| `backend/.env` | **Required** | Supabase Service Role Secret Key for backend-authenticated file operations. | `<your-supabase-service-role-secret-key>` |
| `SUPABASE_STORAGE_BUCKET` | `backend/.env` | Optional | Storage bucket name for business logos. Defaults to `billflow-logos`.| `billflow-logos` |

---

## 2. Frontend Environment Variables (`frontend/.env.local`)

| Variable Name | Location | Requirement | Purpose | Example Placeholder |
| :--- | :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | `frontend/.env.local` | **Required** | Base URL pointing to the FastAPI backend API service. | `http://localhost:8000/api` |

---

## 3. Security & Hygiene Rules

1. **Never Commit Secrets**:
   - `backend/.env` and `frontend/.env.local` are explicitly ignored by git in `.gitignore`.
   - Never commit real passwords, JWT keys, or Supabase service role keys to version control.
2. **Backend-Only Service Role**:
   - The `SUPABASE_SERVICE_ROLE_KEY` must **never** be prefixed with `NEXT_PUBLIC_` or placed in `frontend/.env.local`. It must only exist in `backend/.env`.
3. **Committed Templates**:
   - `backend/.env.example` and `frontend/.env.example` are committed to the repository and explicitly whitelisted in `.gitignore` (`!.env.example`) to document the configuration contract without exposing sensitive data.
