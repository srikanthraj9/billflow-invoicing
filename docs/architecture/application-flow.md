# BillFlow — Application & Data Flows

This document details the complete end-to-end data pathways and user journeys implemented across BillFlow.

---

## 1. Landing & Onboarding Flow

```
Visitor Hits Landing Page (/)
       │
       ├─► Explore Interactive Preview / Feature Grid / Pricing
       │
       ├─► Clicks "Get Started" ──► /signup ──► Submits Name, Email, Password
       │                                            │
       │                                            ▼
       │                                  POST /api/auth/register
       │                                            │
       │                                            ▼
       │                                  Store Token & Redirect
       │                                            │
       └─► Clicks "Sign In"     ──► /login  ──► Submits Credentials / Demo Login
                                                    │
                                                    ▼
                                          POST /api/auth/login
                                                    │
                                                    ▼
                                          Receive Signed JWT
                                                    │
                                                    ▼
                                          Redirect to /dashboard
```

1. **Visitor Landing**: Unauthenticated visitors explore features, dynamic previews, and pricing tiers at `/`.
2. **Registration / Login**: Users submit credentials. Form inputs are validated client-side with React Hook Form and Zod.
3. **JWT Issuance**: On success, backend returns user object and HS256 JWT access token.
4. **Session Activation**: Token is written to `localStorage` under `billflow_access_token`. User is routed to `/dashboard`.

---

## 2. Authenticated Request Flow

```
User Action in React Component
       │
       ▼
Domain Service Method (e.g. invoiceService.getInvoices())
       │
       ▼
Centralized API Client (src/lib/api-client.ts)
       │
       ├─► Retrieves Token: localStorage.getItem('billflow_access_token')
       │
       ├─► Injects Header: Authorization: Bearer <token>
       │
       ▼
FastAPI Route Handler
       │
       ▼
Authentication Dependency (deps.get_current_user)
       │
       ├─► Decode & Validate JWT Signature + Expiry
       ├─► Extract User UUID from 'sub' Claim
       ├─► Query User from Database
       │
       ▼
User-Scoped Domain Service Execution
       │
       ▼
SQLAlchemy Query: WHERE entity.user_id == current_user.id
       │
       ▼
PostgreSQL Execution & JSON Response
```

- **Session Invalidation**: If the JWT is expired or invalid, FastAPI responds with `401 Unauthorized`. `apiClient` catches this, clears `localStorage`, and redirects the user to `/login`.

---

## 3. Client Management Flow

```
User Navigates to /clients/new
       │
       ▼
Submits Client Form (name, email, company, phone, address, notes)
       │
       ▼
clientService.createClient()
       │
       ▼
POST /api/clients (JSON Body)
       │
       ▼
FastAPI clients.create_client Handler
       │
       ├─► Validate input via ClientCreate Pydantic schema
       ├─► Instantiate Client model with user_id = current_user.id
       ├─► Save & Commit to PostgreSQL
       │
       ▼
Return Serialized ClientResponse to Frontend
       │
       ▼
Frontend Appends Client to Cache / Navigates to /clients
```

- **Server-Side Search**: Client searches (`GET /api/clients?search=query`) filter across `name`, `email`, `company`, and `phone` via ILIKE database expressions.
- **RESTRICT Protection**: Attempting to delete a client (`DELETE /api/clients/{id}`) that has linked invoices is blocked by PostgreSQL's foreign key constraint and returns `409 Conflict`.

---

## 4. Invoice Creation & Authoritative Math Flow

```
User Navigates to /invoices/new
       │
       ├─► Selects Client from Dropdown
       ├─► Sets Issue Date & Due Date (or relies on default payment terms)
       ├─► Adds Dynamic Line Items (Description, Quantity, Unit Rate)
       ├─► Sets Discount (Flat or %) & Tax Percentage (or inherits default)
       │
       ▼
Clicks "Create Invoice"
       │
       ▼
POST /api/invoices (Payload includes client_id, dates, items, discount, tax)
       │
       ▼
FastAPI invoices.create_invoice Handler
       │
       ├─► Verify client_id belongs to current_user.id
       ├─► Discard any client-sent calculated amounts (subtotal, total, etc.)
       ├─► Recalculate authoritatively using Python Decimal + ROUND_HALF_UP:
       │     • Line Amount = ROUND_HALF_UP(Qty * Rate)
       │     • Subtotal    = Sum(Line Amounts)
       │     • Taxable     = Max(0, Subtotal - Discount Amount)
       │     • Tax Amount  = ROUND_HALF_UP(Taxable * (Tax% / 100))
       │     • Total       = Taxable + Tax Amount
       ├─► Generate Next Sequential Number: {PREFIX}-{0001}
       ├─► Generate Cryptographic Public Token: secrets.token_urlsafe(32)
       ├─► Commit Invoice + InvoiceItems Atomically
       │
       ▼
Return Authoritative InvoiceResponse to Frontend
```

---

## 5. Public Invoice Sharing & Viewing Flow

```
Merchant Clicks "Share" on /invoices/[id]
       │
       ▼
Frontend Opens ShareInvoiceModal
       │
       ├─► Generates Shareable Link: /public/invoice/{public_token}
       └─► Generates QR Code for Direct Mobile Scan
       │
       ▼
Customer Opens Link in Browser (No Login Required)
       │
       ▼
Next.js Page: /public/invoice/[token]
       │
       ▼
GET /api/public/invoices/{token} (skipAuth: true, No Bearer Token)
       │
       ▼
FastAPI public.get_public_invoice Handler
       │
       ├─► Query Invoice WHERE public_token = token
       ├─► Check Status: If 'draft', return 404 Not Found (draft privacy protection)
       ├─► If due_date < today AND status == 'sent' ──► Status evaluates to 'overdue'
       ├─► Fetch Merchant BusinessSettings & Logo URL
       ├─► Sanitize Response: Strip user_id, client_id, internal invoice UUIDs, and token
       │
       ▼
Render Public Invoice Portal with Invoice Details & Merchant Branding
```

---

## 6. Simulated Payment Settlement Flow

```
Customer Clicks "Pay Invoice" in Public Portal
       │
       ▼
PaymentDialog Displays Settlement Preview
       │
       ▼
Customer Submits Payment (Simulated Settlement)
       │
       ▼
POST /api/public/invoices/{token}/pay (No Auth Header)
       │
       ▼
FastAPI public.pay_public_invoice Handler
       │
       ▼
Begin Atomic PostgreSQL Transaction
       │
       ├─► Lock Invoice Row: SELECT ... FOR UPDATE
       │
       ├─► Validate Status:
       │     • If status == 'paid' ──► Abort & Return 400 "Invoice is already paid"
       │     • If status != 'sent' and != 'overdue' ──► Abort & Return 400
       │
       ├─► Transition Status: status = 'paid'
       ├─► Stamp Timestamp: paid_at = datetime.now(timezone.utc)
       │
       ▼
Commit Transaction & Return Updated Status
       │
       ▼
Frontend Displays PaymentSuccessModal & Freezes Invoice as Paid
```

---

## 7. Dashboard Analytics Flow

```
User Navigates to /dashboard
       │
       ▼
dashboardService.getDashboardStats()
       │
       ▼
GET /api/dashboard/stats?months=6
       │
       ▼
FastAPI dashboard.get_dashboard_stats Handler
       │
       ├─► Scope to WHERE user_id == current_user.id
       ├─► Calculate Total Earned: SUM(total_amount) WHERE status == 'paid'
       ├─► Calculate Outstanding:  SUM(total_amount) WHERE status == 'sent' AND due_date >= today
       ├─► Calculate Overdue:      SUM(total_amount) WHERE status == 'sent' AND due_date < today
       ├─► Count Invoices: Total, Paid, Pending, Overdue
       ├─► Query Monthly Income Timeline: Group payments by YYYY-MM across continuous period
       ├─► Query Recent Invoices: Latest 5 invoices ordered by created_at DESC
       │
       ▼
Return Comprehensive DashboardStatsResponse
       │
       ▼
Frontend Renders StatCards, IncomeChart (SVG), OverdueAlert, and RecentInvoices Feed
```

---

## 8. Settings & Logo Storage Flow

```
User Updates Profile / Preferences on /settings
       │
       ▼
settingsService.updateSettings()
       │
       ▼
PUT /api/settings (business_name, email, phone, address, currency, prefix, tax, terms)
       │
       ▼
FastAPI settings.update_settings Handler ──► Upsert business_settings Record
       │
       ▼
User Uploads New Brand Logo
       │
       ▼
POST /api/settings/logo (multipart/form-data)
       │
       ▼
FastAPI settings.upload_logo Handler
       │
       ├─► Check File Size <= 2 MB (Else 413)
       ├─► Verify MIME Type (image/png, image/jpeg, image/webp)
       ├─► Deep Image Verification via Pillow (Verify headers, dimensions, uncorrupted)
       ├─► Generate Deterministic Storage Path: users/{user_id}/logo/{uuid}.{ext}
       ├─► Upload to Supabase Storage ('billflow-logos' bucket)
       ├─► Obtain Public CDN URL
       ├─► Update business_settings.logo_url = public_url
       │
       ▼
Return LogoUploadResponse with logo_url
       │
       ▼
Frontend Updates SettingsPreview and Persists Active Branding
```
