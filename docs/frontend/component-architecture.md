# BillFlow — Frontend Component Architecture

This document catalogs the component tree and domain organization across the BillFlow frontend application.

---

## 1. Component Domain Structure

```
frontend/src/components/
├── auth/                         # Authentication forms & layout
├── clients/                      # Client management widgets & views
├── dashboard/                    # Analytics widgets & timeline charts
├── invoices/                     # Invoice builder, viewer, and filters
├── landing/                      # Public marketing page sections
├── layout/                       # App layout shell, navigation, and headers
├── public-invoice/               # Customer invoice portal & payment dialogs
├── settings/                     # Settings forms & logo uploader
└── ui/                           # Atomic reusable UI primitives
```

---

## 2. Component Directory & Responsibilities

### 2.1 Layout Components (`src/components/layout/`)
- **`AppLayout`**: The authenticated application shell. Renders the desktop `Sidebar`, handles route-change state, and houses the main scrollable content area.
- **`Sidebar`**: Desktop left-hand navigation sidebar. Shows brand logo, primary nav links (Dashboard, Clients, Invoices, Settings), user profile summary, and logout button.
- **`MobileHeader`**: Top bar rendered on mobile/tablet viewports (< 1024px) featuring brand logo and hamburger drawer toggle.
- **`MobileNav`**: Full-screen slide-out mobile drawer replicating sidebar navigation links.
- **`PageHeader`**: Standardized header block containing page title, subtitle, and primary call-to-action buttons.

### 2.2 Landing Page Components (`src/components/landing/`)
- **`LandingHeader`**: Public navigation bar with login/signup buttons and smooth anchor scrolling.
- **`HeroSection`**: Value proposition headline, animated product badges, and primary action buttons.
- **`DashboardPreview`**: High-fidelity interactive preview showcasing live dashboard metrics.
- **`InvoicePreviewSection`**: Interactive invoice card demonstrating line-item additions and tax calculations.
- **`ProblemSolutionSection`**: Side-by-side comparison between manual spreadsheets and BillFlow.
- **`FeaturesSection`**: 6-card feature grid highlighting speed, decimal precision, privacy, and storage.
- **`HowItWorksSection`**: 3-step timeline (Add Client ➔ Build Invoice ➔ Get Paid).
- **`PricingSection`**: Free, Starter, and Pro pricing cards.
- **`FaqSection`**: Accordion FAQ component addressing common customer questions.
- **`FinalCtaSection`**: Closing call-to-action banner.
- **`LandingFooter`**: Footer with copyright and documentation links.

### 2.3 Authentication Components (`src/components/auth/`)
- **`AuthLayout`**: Split-screen container featuring a dark gradient branding panel on desktop and centered form container.
- **`LoginForm`**: Email and password form with loading states, error alerts, and demo login buttons.
- **`SignupForm`**: Registration form with password requirements feedback and immediate session activation.
- **`PasswordInput`**: Reusable input component with eye toggle for password visibility.
- **`AuthDivider`**: Visual "or continue with" horizontal separator.
- **`GoogleAuthButton`**: Social login button placeholder for future OAuth integrations.
- **`ForgotPasswordModal`**: Dialog for self-service password reset requests.

### 2.4 Dashboard Components (`src/components/dashboard/`)
- **`WelcomeBanner`**: Greeting card with current date and fast shortcuts.
- **`DashboardStats`**: Grid of 3 primary KPI cards (Total Earned, Total Outstanding, Total Overdue).
- **`StatCard`**: Single KPI card with icon, formatted currency, count badge, and trend indicator.
- **`IncomeChart`**: Native responsive SVG bar chart visualizing continuous 6-month or 12-month revenue.
- **`OverdueAlert`**: Prominent banner rendered when overdue invoices exist, with one-click filter action.
- **`RecentInvoices`**: Compact table displaying the latest 5 invoices with status badges and quick links.
- **`QuickActions`**: Action panel for creating new invoices or adding clients.
- **`DashboardSkeleton`**: Shimmer loading state for metrics and chart widgets.

### 2.5 Client Components (`src/components/clients/`)
- **`ClientList`**: Controller managing client search input, grid/table view toggle, and empty state rendering.
- **`ClientTable`**: Dense tabular view of clients with contact info, outstanding balance, and action menu.
- **`ClientCard`**: Card view presenting client business profile, email, phone, and outstanding balance.
- **`ClientForm`**: Form for creating or editing client details with validation feedback.
- **`ClientSkeleton`**: Placeholder loading skeletons for grid and table layouts.

### 2.6 Invoice Components (`src/components/invoices/`)
- **`InvoiceList`**: Controller for invoice directory with pagination and empty state handling.
- **`InvoiceFilterBar`**: Search bar, status chips (`all`, `draft`, `sent`, `paid`, `overdue`), client dropdown filter, and sort selector.
- **`InvoiceTable`**: Dense invoice table with status badges, formatted amounts, and action buttons.
- **`InvoiceCard`**: Mobile-optimized card representation of an invoice.
- **`InvoiceForm`**: Full invoice builder with client selector, date pickers, tax, and discount inputs.
- **`LineItemsEditor`**: Dynamic list manager for adding, removing, and calculating line items.
- **`InvoiceSummary`**: Financial summary box calculating subtotal, discount, tax, and total.
- **`InvoiceDocument`**: Full paper preview document with merchant branding, client info, and print styling.
- **`ShareInvoiceModal`**: Share dialog with copyable public URL and QR code.
- **`InvoiceSkeleton`** & **`InvoiceDetailSkeleton`**: Loading states for invoice builder and preview views.

### 2.7 Public Invoice Components (`src/components/public-invoice/`)
- **`PublicInvoicePortal`**: Customer-facing portal page showing merchant branding, invoice details, and status.
- **`PaymentDialog`**: Simulated payment checkout modal with credit card fields and pay action.
- **`PaymentSuccessModal`**: Animated confirmation dialog displayed after successful payment settlement.
- **`PublicInvoiceSkeleton`**: Loading state for public invoice pages.

### 2.8 Settings Components (`src/components/settings/`)
- **`SettingsContainer`**: Tab controller switching between Business Profile and Invoicing Preferences.
- **`BusinessProfileForm`**: Form for business name, email, phone, and address.
- **`InvoicePreferencesForm`**: Form for default currency, invoice prefix, default tax rate, and payment terms.
- **`LogoUploader`**: Drag-and-drop file uploader with preview, size checking, and delete button.
- **`SettingsPreview`**: Live invoice preview card reflecting merchant branding modifications in real time.
- **`SettingsSkeleton`**: Loading state for settings page.
