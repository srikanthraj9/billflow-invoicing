# BillFlow — SQLAlchemy Database Models

This document details the five SQLAlchemy 2.0 ORM models implemented in `backend/app/models/`.

---

## 1. `User` (`app/models/user.py`)

- **Table Name**: `users`
- **Purpose**: Represents a registered merchant account holding ownership of all system resources.
- **Fields**:
  - `id`: `UUID` (Primary Key, default `uuid.uuid4`)
  - `name`: `String(100)`, NOT NULL — Merchant's personal or trade name.
  - `email`: `String(255)`, UNIQUE, NOT NULL, INDEXED — Login username and primary contact.
  - `password_hash`: `String(255)`, NOT NULL — Bcrypt hash of the user's password.
  - `created_at`: `DateTime(timezone=True)`, default UTC now.
  - `updated_at`: `DateTime(timezone=True)`, default UTC now, onupdate UTC now.
- **Relationships**:
  - `settings`: One-to-one with `BusinessSettings` (`back_populates="user"`, `cascade="all, delete-orphan"`).
  - `clients`: One-to-many with `Client` (`back_populates="user"`, `cascade="all, delete-orphan"`).
  - `invoices`: One-to-many with `Invoice` (`back_populates="user"`, `cascade="all, delete-orphan"`).
- **Lifecycle**: Root entity. Deletion cascades to all owned entities.

---

## 2. `BusinessSettings` (`app/models/business_settings.py`)

- **Table Name**: `business_settings`
- **Purpose**: Stores business profile metadata, default invoicing parameters, and branding.
- **Fields**:
  - `id`: `UUID` (Primary Key, default `uuid.uuid4`)
  - `user_id`: `UUID`, FOREIGN KEY (`users.id`, `ondelete="CASCADE"`), UNIQUE, NOT NULL — Owner reference.
  - `business_name`: `String(255)`, Nullable — Display name on generated invoices.
  - `business_email`: `String(255)`, Nullable — Contact email printed on invoices.
  - `business_phone`: `String(50)`, Nullable — Telephone printed on invoices.
  - `business_address`: `Text`, Nullable — Street address formatted on invoices.
  - `logo_url`: `String(1024)`, Nullable — Supabase Storage public CDN URL.
  - `currency`: `String(10)`, DEFAULT `'INR'`, NOT NULL — Default currency code (`INR`, `USD`, `EUR`, `GBP`).
  - `invoice_prefix`: `String(20)`, DEFAULT `'INV'`, NOT NULL — Numbering prefix (`INV-0001`).
  - `default_tax_percentage`: `Numeric(5, 2)`, DEFAULT `18.00`, NOT NULL — Default tax rate.
  - `default_payment_terms_days`: `Integer`, DEFAULT `14`, NOT NULL — Default due date offset in days.
  - `created_at`, `updated_at`: Standard UTC timestamps.
- **Ownership**: Owned exclusively by one `User`.

---

## 3. `Client` (`app/models/client.py`)

- **Table Name**: `clients`
- **Purpose**: Represents a client or customer entity created by the merchant.
- **Fields**:
  - `id`: `UUID` (Primary Key, default `uuid.uuid4`)
  - `user_id`: `UUID`, FOREIGN KEY (`users.id`, `ondelete="CASCADE"`), NOT NULL, INDEXED — Owner reference.
  - `name`: `String(255)`, NOT NULL, INDEXED — Primary client contact or business name.
  - `email`: `String(255)`, Nullable, INDEXED — Client email for invoicing.
  - `company`: `String(255)`, Nullable, INDEXED — Organization name.
  - `phone`: `String(50)`, Nullable, INDEXED — Contact phone number.
  - `address`: `Text`, Nullable — Billing address.
  - `notes`: `Text`, Nullable — Private internal merchant notes.
  - `created_at`, `updated_at`: Standard UTC timestamps.
- **Relationships**:
  - `invoices`: One-to-many with `Invoice` (`back_populates="client"`).
- **Constraints**: Deleting a client that has linked invoices is blocked by PostgreSQL (`RESTRICT`), raising a foreign key violation.

---

## 4. `Invoice` (`app/models/invoice.py`)

- **Table Name**: `invoices`
- **Purpose**: Represents an invoice document with financial totals, lifecycle status, and public access token.
- **Fields**:
  - `id`: `UUID` (Primary Key, default `uuid.uuid4`)
  - `user_id`: `UUID`, FOREIGN KEY (`users.id`, `ondelete="CASCADE"`), NOT NULL, INDEXED — Merchant owner.
  - `client_id`: `UUID`, FOREIGN KEY (`clients.id`, `ondelete="RESTRICT"`), NOT NULL, INDEXED — Client reference.
  - `invoice_number`: `String(50)`, NOT NULL, INDEXED — Formatted identifier (`INV-0001`).
  - `public_token`: `String(64)`, UNIQUE, NOT NULL, INDEXED — Cryptographic 32-byte URL-safe token.
  - `issue_date`: `Date`, NOT NULL — Invoice issue date.
  - `due_date`: `Date`, NOT NULL — Invoice due date.
  - `status`: `String(20)`, DEFAULT `'draft'`, NOT NULL, INDEXED — State (`draft`, `sent`, `paid`).
  - `subtotal`: `Numeric(12, 2)`, NOT NULL — Authoritative sum of line items.
  - `discount_percentage`: `Numeric(5, 2)`, DEFAULT `0.00`, NOT NULL.
  - `discount_amount`: `Numeric(12, 2)`, DEFAULT `0.00`, NOT NULL.
  - `tax_percentage`: `Numeric(5, 2)`, DEFAULT `0.00`, NOT NULL.
  - `tax_amount`: `Numeric(12, 2)`, DEFAULT `0.00`, NOT NULL.
  - `total_amount`: `Numeric(12, 2)`, NOT NULL — Final balance payable.
  - `currency`: `String(10)`, NOT NULL — ISO currency code.
  - `notes`: `Text`, Nullable — Payment instructions or notes to client.
  - `sent_at`: `DateTime(timezone=True)`, Nullable — Timestamp when invoice was marked sent.
  - `paid_at`: `DateTime(timezone=True)`, Nullable — Timestamp when invoice was marked paid.
  - `created_at`, `updated_at`: Standard UTC timestamps.
- **Relationships**:
  - `items`: One-to-many with `InvoiceItem` (`cascade="all, delete-orphan"`).
  - `client`: Many-to-one with `Client` (`lazy="joined"`).

---

## 5. `InvoiceItem` (`app/models/invoice_item.py`)

- **Table Name**: `invoice_items`
- **Purpose**: Represents an individual billed line item within an invoice.
- **Fields**:
  - `id`: `UUID` (Primary Key, default `uuid.uuid4`)
  - `invoice_id`: `UUID`, FOREIGN KEY (`invoices.id`, `ondelete="CASCADE"`), NOT NULL, INDEXED.
  - `description`: `String(500)`, NOT NULL — Line item description.
  - `quantity`: `Numeric(10, 2)`, NOT NULL — Billed units (supports fractional, e.g. 1.5).
  - `unit_rate`: `Numeric(12, 2)`, NOT NULL — Unit price in currency units.
  - `amount`: `Numeric(12, 2)`, NOT NULL — Authoritative line total (`quantity * unit_rate`).
  - `created_at`, `updated_at`: Standard UTC timestamps.
- **Lifecycle**: Strictly dependent on parent `Invoice`. Deleting an invoice removes all its items.
