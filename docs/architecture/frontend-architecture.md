# BillFlow — Frontend Architecture

The BillFlow frontend is built with **Next.js 16.3.4 (App Router)**, **React 19.2.8**, **TypeScript 5**, and **Tailwind CSS v4**. It implements a clean layered architecture with complete separation between UI components, state management, domain services, and HTTP networking.

---

## 1. Actual Directory Structure

```
frontend/
├── src/
│   ├── app/                              # Next.js App Router routes & layouts
│   │   ├── layout.tsx                    # Root HTML document and global font setup
│   │   ├── page.tsx                      # High-converting SaaS marketing landing page
│   │   ├── login/page.tsx                # Authenticated login with demo credentials
│   │   ├── signup/page.tsx               # Account registration
│   │   ├── dashboard/page.tsx            # Executive KPI metrics & charts
│   │   ├── clients/                      # Client management routes
│   │   │   ├── page.tsx                  # Client list with table/card views and search
│   │   │   ├── new/page.tsx              # Create client form
│   │   │   └── [id]/edit/page.tsx        # Edit client form
│   │   ├── invoices/                     # Invoice management routes
│   │   │   ├── page.tsx                  # Invoice list with filters and sort
│   │   │   ├── new/page.tsx              # Dynamic invoice builder
│   │   │   └── [id]/page.tsx             # Invoice preview, actions, and PDF print
│   │   ├── settings/page.tsx             # Business branding, currency, and logo upload
│   │   └── public/                       # Public unauthenticated routes
│   │       └── invoice/[token]/page.tsx  # Customer portal with simulated payment
│   │
│   ├── components/                       # React components grouped by domain
│   │   ├── auth/                         # Forms, layouts, and auth modals
│   │   ├── clients/                      # Client cards, forms, tables, and skeletons
│   │   ├── dashboard/                    # Metric cards, SVG charts, and alerts
│   │   ├── invoices/                     # Document layout, line item editor, filters
│   │   ├── landing/                      # Landing page sections (hero, features, FAQ)
│   │   ├── layout/                       # Sidebar, mobile navigation, page headers
│   │   ├── public-invoice/               # Public portal dialogs and success modals
│   │   ├── settings/                     # Settings forms, logo uploader, preview
│   │   └── ui/                           # Reusable atomic UI primitives
│   │
│   └── lib/                              # Core application libraries & services
│       ├── api-client.ts                 # Centralized HTTP client with JWT interceptor
│       ├── auth-token.ts                 # LocalStorage token accessors
│       ├── utils.ts                      # Formatting helpers (currency, dates, cn)
│       ├── services/                     # Domain-specific backend API services
│       │   ├── authService.ts            # Authentication & me profile
│       │   ├── clientService.ts          # Client CRUD & search
│       │   ├── invoiceService.ts         # Invoice CRUD, transitions, & filters
│       │   ├── dashboardService.ts       # Dashboard metrics & revenue timeline
│       │   ├── settingsService.ts        # Business settings & logo upload
│       │   ├── publicInvoiceService.ts   # Public invoice fetching & payment
│       │   └── index.ts                  # Barrel export
│       └── types/                        # TypeScript interfaces & domain types
│           ├── auth.ts
│           ├── client.ts
│           ├── invoice.ts
│           ├── dashboard.ts
│           ├── settings.ts
│           └── index.ts
│
├── tests/                                # Integration & QA test suites
│   ├── run-all-tests.mjs                 # Cross-platform runner
│   ├── test-auth-integration.ts
│   ├── test-client-integration.ts
│   ├── test-invoice-integration.ts
│   ├── test-public-invoice-integration.ts
│   ├── test-dashboard-integration.ts
│   ├── test-settings-integration.ts
│   └── test-fullstack-qa.ts
│
├── public/                               # Static images, favicon, icons
├── package.json                          # Scripts & dependencies
└── tsconfig.json                         # TypeScript configuration
```

---

## 2. Core Architectural Layers

### 2.1 Next.js App Router (12 Routes)
Next.js 16 App Router handles file-system based routing:
- **Root Layout (`src/app/layout.tsx`)**: Wraps all pages in Inter typography, dark slate backgrounds, and standard viewport meta.
- **Authenticated Shell**: Protected routes (`/dashboard`, `/clients`, `/invoices`, `/settings`) use `AppLayout`, integrating `Sidebar`, `MobileHeader`, and session guarding.
- **Public Routes**: The landing page (`/`) and public portal (`/public/invoice/[token]`) run outside the authenticated sidebar shell.

### 2.2 Reusable UI Component Architecture (`src/components/ui/`)
Atomic, accessible components built without third-party component library bloat:
- **`Button`**: Primary, secondary, danger, ghost variants with native loading states.
- **`Card`**: Elevated slate containers with glassmorphism borders (`border-slate-800/80`).
- **`Badge`**: Status-aware chips with curated palettes (`draft` = slate, `sent` = amber, `paid` = emerald, `overdue` = rose).
- **`Modal` & `ConfirmationDialog`**: Accessible dialogs with escape key and backdrop dismissals.
- **`Input`, `Select`, `Textarea`**: Standardized form controls with inline validation error states.
- **`Skeleton`**: Shimmer animations providing immediate visual feedback during async operations.

### 2.3 Central API Client (`src/lib/api-client.ts`)
The `apiClient` singleton abstracts all HTTP `fetch` interactions:
- **Bearer Token Injection**: Automatically retrieves the token via `getAuthToken()` and sets `Authorization: Bearer <token>` unless `skipAuth: true` is provided.
- **Base URL Routing**: Dispatches requests to `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000/api`).
- **Error Wrapping**: Maps failed HTTP status codes (400, 401, 403, 404, 409, 413, 415, 422, 500) into typed `ApiError` instances containing structured server error details.
- **Automatic 401 Interception**: When a 401 status is encountered on an authenticated route, the client wipes stored credentials and redirects to `/login`.

### 2.4 Domain Service Layer (`src/lib/services/`)
Separates UI components from raw network protocols:
- UI components never make direct `fetch()` calls.
- Services transform API snake_case schemas into clean TypeScript camelCase structures.
- Client-side optimistic filtering and search fallbacks operate gracefully if offline.
