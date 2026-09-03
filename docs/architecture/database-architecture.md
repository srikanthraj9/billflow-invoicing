# BillFlow — Database Architecture

BillFlow uses **PostgreSQL** as its relational database, mapped through **SQLAlchemy 2.0** ORM models and version-controlled using **Alembic**.

---

## 1. Entity Relationships

```
users (1)
  ├── clients (1:N) ──────────────┐
  │                               ▼ (RESTRICT)
  ├── invoices (1:N) ◄────────────┘
  │     └── invoice_items (1:N, CASCADE)
  │
  └── business_settings (1:1, CASCADE)
```

---

## 2. Table Specifications & Columns

### 2.1 `users`
Represents registered merchant accounts.
- `id`: UUID (Primary Key, default `uuid.uuid4`)
- `name`: VARCHAR(100), NOT NULL
- `email`: VARCHAR(255), UNIQUE, NOT NULL, INDEXED
- `password_hash`: VARCHAR(255), NOT NULL
- `created_at`: TIMESTAMP WITH TIME ZONE (UTC), NOT NULL
- `updated_at`: TIMESTAMP WITH TIME ZONE (UTC), NOT NULL

### 2.2 `business_settings`
Stores branding, currency preferences, and invoice defaults per user.
- `id`: UUID (Primary Key, default `uuid.uuid4`)
- `user_id`: UUID, FOREIGN KEY (`users.id`, `ON DELETE CASCADE`), UNIQUE, NOT NULL
- `business_name`: VARCHAR(255), Nullable
- `business_email`: VARCHAR(255), Nullable
- `business_phone`: VARCHAR(50), Nullable
- `business_address`: TEXT, Nullable
- `logo_url`: VARCHAR(1024), Nullable
- `currency`: VARCHAR(10), DEFAULT `'INR'`, NOT NULL
- `invoice_prefix`: VARCHAR(20), DEFAULT `'INV'`, NOT NULL
- `default_tax_percentage`: NUMERIC(5, 2), DEFAULT `18.00`, NOT NULL
- `default_payment_terms_days`: INTEGER, DEFAULT `14`, NOT NULL
- `created_at`: TIMESTAMP WITH TIME ZONE (UTC), NOT NULL
- `updated_at`: TIMESTAMP WITH TIME ZONE (UTC), NOT NULL

### 2.3 `clients`
Represents customer/client records owned by a merchant.
- `id`: UUID (Primary Key, default `uuid.uuid4`)
- `user_id`: UUID, FOREIGN KEY (`users.id`, `ON DELETE CASCADE`), NOT NULL, INDEXED
- `name`: VARCHAR(255), NOT NULL, INDEXED
- `email`: VARCHAR(255), Nullable, INDEXED
- `company`: VARCHAR(255), Nullable, INDEXED
- `phone`: VARCHAR(50), Nullable, INDEXED
- `address`: TEXT, Nullable
- `notes`: TEXT, Nullable
- `created_at`: TIMESTAMP WITH TIME ZONE (UTC), NOT NULL
- `updated_at`: TIMESTAMP WITH TIME ZONE (UTC), NOT NULL

### 2.4 `invoices`
Represents invoices issued by a user to a specific client.
- `id`: UUID (Primary Key, default `uuid.uuid4`)
- `user_id`: UUID, FOREIGN KEY (`users.id`, `ON DELETE CASCADE`), NOT NULL, INDEXED
- `client_id`: UUID, FOREIGN KEY (`clients.id`, `ON DELETE RESTRICT`), NOT NULL, INDEXED
- `invoice_number`: VARCHAR(50), NOT NULL, INDEXED
- `public_token`: VARCHAR(64), UNIQUE, NOT NULL, INDEXED
- `issue_date`: DATE, NOT NULL
- `due_date`: DATE, NOT NULL
- `status`: VARCHAR(20), DEFAULT `'draft'`, NOT NULL, INDEXED (`draft`, `sent`, `paid`)
- `subtotal`: NUMERIC(12, 2), NOT NULL
- `discount_percentage`: NUMERIC(5, 2), DEFAULT `0.00`, NOT NULL
- `discount_amount`: NUMERIC(12, 2), DEFAULT `0.00`, NOT NULL
- `tax_percentage`: NUMERIC(5, 2), DEFAULT `0.00`, NOT NULL
- `tax_amount`: NUMERIC(12, 2), DEFAULT `0.00`, NOT NULL
- `total_amount`: NUMERIC(12, 2), NOT NULL
- `currency`: VARCHAR(10), NOT NULL
- `notes`: TEXT, Nullable
- `sent_at`: TIMESTAMP WITH TIME ZONE (UTC), Nullable
- `paid_at`: TIMESTAMP WITH TIME ZONE (UTC), Nullable
- `created_at`: TIMESTAMP WITH TIME ZONE (UTC), NOT NULL
- `updated_at`: TIMESTAMP WITH TIME ZONE (UTC), NOT NULL

### 2.5 `invoice_items`
Represents line items billed within an invoice.
- `id`: UUID (Primary Key, default `uuid.uuid4`)
- `invoice_id`: UUID, FOREIGN KEY (`invoices.id`, `ON DELETE CASCADE`), NOT NULL, INDEXED
- `description`: VARCHAR(500), NOT NULL
- `quantity`: NUMERIC(10, 2), NOT NULL
- `unit_rate`: NUMERIC(12, 2), NOT NULL
- `amount`: NUMERIC(12, 2), NOT NULL
- `created_at`: TIMESTAMP WITH TIME ZONE (UTC), NOT NULL
- `updated_at`: TIMESTAMP WITH TIME ZONE (UTC), NOT NULL

---

## 3. Data Integrity & Constraints

1. **Multi-Tenant Ownership**: Every entity (client, invoice, business_settings) includes a non-nullable `user_id` foreign key referencing `users.id`.
2. **Client-Invoice Relationship (`ON DELETE RESTRICT`)**:
   Deleting a client record that has associated invoices is rejected by PostgreSQL with a foreign key violation (`409 Conflict`), ensuring financial history remains permanent and audit-compliant.
3. **Line-Item Lifecycle (`ON DELETE CASCADE`)**:
   Deleting a draft invoice automatically cascades and removes all of its associated `invoice_items`.
4. **Public Token Uniqueness**:
   The `public_token` column enforces a unique index, ensuring zero collisions across the platform.

---

## 4. Alembic Migration History

- **Current Migration Head**: `bb3f22575463`
- **Revisions**:
  1. `4c4fa5194993`: Initial schema setup for `users`, `clients`, `invoices`, `invoice_items`, and `business_settings`.
  2. `bb3f22575463`: Enforced `RESTRICT` foreign key on `invoices.client_id`, refined column nullability, and added indexes.
