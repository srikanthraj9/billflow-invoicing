# BillFlow — Backend Automated Test Suites (128 Tests)

The backend test suite is implemented in Python using **Pytest** and **HTTPX**, executing 128 automated test cases across six domain test modules in `backend/tests/`.

---

## 1. Test Execution & Result

```bash
cd backend
python -m pytest -q
```
**Execution Verdict**: `128 passed in 406.81s (100% PASS)`

---

## 2. Test Modules Breakdown

| Test Module | Test File | Tests Passed | Domain Tested |
| :--- | :--- | :---: | :--- |
| **Authentication** | `tests/test_auth.py` | 22 / 22 | Registration, Bcrypt hashing, JWT generation, expiry, validation |
| **Client Management** | `tests/test_clients.py` | 18 / 18 | Multi-tenant client CRUD, server-side ILIKE search, RESTRICT FK |
| **Invoices & Finance** | `tests/test_invoices.py` | 36 / 36 | Decimal rounding (`ROUND_HALF_UP`), line items, state machine, numbering |
| **Public Portal** | `tests/test_public_invoices.py`| 18 / 18 | Public token access, privacy sanitization, simulated payment, row locks |
| **Dashboard** | `tests/test_dashboard.py` | 16 / 16 | KPI metrics, dynamic overdue detection, continuous 6/12-mo timeline |
| **Settings & Storage** | `tests/test_settings.py` | 18 / 18 | Business preferences, defaults inheritance, Supabase logo uploads |
| **Total** | **6 Test Modules** | **128 / 128** | **All Backend Functional Subsystems Verified** |

---

## 3. Key Scenarios Verified by Module

### 3.1 `test_auth.py` (22 Tests)
- Weak passwords (<8 chars) rejected with `422 Unprocessable Entity`.
- Invalid email formats rejected with `422 Unprocessable Entity`.
- Duplicate email registrations rejected with `409 Conflict`.
- Bcrypt verification uses constant-time comparison to prevent timing attacks.
- Expired tokens rejected with `401 Unauthorized`.
- Serialized user responses never leak plaintext password or `password_hash`.

### 3.2 `test_clients.py` (18 Tests)
- Creating clients persists all attributes (`name`, `email`, `company`, `phone`, `address`, `notes`).
- Multi-field search filters across name, company, email, and phone via case-insensitive patterns.
- Cross-tenant access: User B attempting to view, update, or delete User A's client returns `404 Not Found`.
- Deleting a client with existing invoices is rejected with `409 Conflict` (PostgreSQL `RESTRICT` constraint).

### 3.3 `test_invoices.py` (36 Tests)
- Financial precision: `1.5 * 99.99 = 149.985` rounds half up to `149.99`.
- Subtotal sums all line items authoritatively.
- Tax calculation correctly computes percentage of taxable base (`subtotal - discount`).
- Client-supplied tampering values (`subtotal`, `tax_amount`, `total_amount`) are discarded.
- Sequential numbering assigns next formatted number (`INV-0001`, `INV-0002`).
- State machine: `draft` ➔ `sent` ➔ `paid`; illegal transitions (`draft` ➔ `paid`, `sent` ➔ `draft`) rejected with `400 Bad Request`.
- Paid invoices cannot be edited or deleted.

### 3.4 `test_public_invoices.py` (18 Tests)
- Unauthenticated GET requests with public token return 200 without Authorization header.
- Draft invoices return `404 Not Found` when requested via public token.
- Public response payload strips internal database UUIDs (`id`, `user_id`, `client_id`, `item_id`).
- Simulated payment transitions status to `paid` and stamps `paid_at`.
- Repeated payment attempts on paid invoices return `400 Bad Request` ("Invoice is already paid").

### 3.5 `test_dashboard.py` (16 Tests)
- Total Earned sums only `paid` invoices.
- Total Outstanding sums `sent` invoices with due dates in the future.
- Total Overdue dynamically includes unpaid invoices with past due dates.
- Monthly revenue returns continuous unbroken data points across 6 or 12 months, filling missing months with 0.00.

### 3.6 `test_settings.py` (18 Tests)
- Business settings updates persist to database.
- Explicit 0% tax default persists without defaulting back to 18%.
- Supabase logo upload accepts PNG, JPEG, and WEBP under 2 MB.
- Oversized uploads (>2 MB) rejected with `413/400`.
- Corrupted images rejected via Pillow header inspection (`415/400`).
- Logo replacement updates the active URL and cleans up previous storage objects.
