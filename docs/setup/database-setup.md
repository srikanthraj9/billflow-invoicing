# BillFlow — Database Setup & Alembic Migrations

BillFlow uses **PostgreSQL** (compatible with local PostgreSQL or cloud Supabase instances). All database schema operations are managed through **Alembic**.

> [!IMPORTANT]
> Never create or alter tables manually via raw SQL. Alembic is the single source of truth for the database schema.

---

## 1. Database Connection Configuration

Configure your database connection strings in `backend/.env`:
```env
DATABASE_URL=postgresql+psycopg://postgres:<password>@<host>:5432/<database>
DIRECT_URL=postgresql+psycopg://postgres:<password>@<host>:5432/<database>
```

- **`DATABASE_URL`**: Used by the application runtime. If using Supabase, use the Transaction Pooler connection string (port 6543 or 5432).
- **`DIRECT_URL`**: Used for direct DDL migrations (Alembic). If using a local PostgreSQL instance, `DATABASE_URL` and `DIRECT_URL` may be identical.

---

## 2. Alembic Migration Commands

All migration commands must be executed from the `backend/` directory:

### 2.1 Apply Migrations
To upgrade the database to the latest schema revision:
```bash
cd backend
python -m alembic upgrade head
```

### 2.2 Verify Current Migration Revision
Check which revision is currently applied to the target database:
```bash
python -m alembic current
```
**Expected Output**:
```
bb3f22575463 (head)
```

### 2.3 Verify Schema Synchronization (Drift Check)
Check whether there is any drift between SQLAlchemy models and the physical database tables:
```bash
python -m alembic check
```
**Expected Output**:
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
No new upgrade operations detected.
```

---

## 3. Migration History

| Revision Hash | File Name | Description |
| :--- | :--- | :--- |
| `4c4fa5194993` | `4c4fa5194993_initial_schema_users_clients_invoices_.py` | Initial schema creating `users`, `business_settings`, `clients`, `invoices`, and `invoice_items`. |
| `bb3f22575463` (head) | `bb3f22575463_refine_foreign_keys_nullability_and_.py` | Applied `RESTRICT` foreign keys, refined nullability, and added query indexes. |
