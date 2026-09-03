# BillFlow — Backend Data Flow & Processing Logic

This document details how incoming HTTP requests are processed, authenticated, validated, computed, persisted, and serialized across the BillFlow backend.

---

## 1. Request Execution Pipeline

```
Incoming HTTP Request
       │
       ▼
FastAPI Route Handler (`app/api/*.py`)
       │
       ├─► Dependency: `deps.get_db` ──► Obtains scoped SQLAlchemy Session
       │
       ├─► Dependency: `deps.get_current_user`
       │     ├── Decodes Bearer token via Python-JOSE (`HS256`)
       │     ├── Validates signature and UTC expiration
       │     ├── Extracts user UUID (`sub` claim)
       │     └── Queries User from database; returns `current_user`
       │
       ▼
Pydantic Request Validation (`app/schemas/*.py`)
       │ Validates data types, string bounds, and nested line items
       │ (e.g. `InvoiceCreate`, `ClientUpdate`)
       ▼
Domain Service Execution (`app/services/*.py`)
       │ Enforces business rules, state machine transitions,
       │ calculations, and query construction
       ▼
SQLAlchemy 2.0 ORM (`app/models/*.py`)
       │ Executes query scoped to: `WHERE user_id == current_user.id`
       │ Manages database transactions and row-level locks
       ▼
PostgreSQL Database
       │ Executes ACID statements; enforces foreign keys and unique indexes
       ▼
Pydantic Response Serialization (`app/schemas/*.py`)
       │ Converts ORM attributes to JSON; masks internal or sensitive data
       ▼
HTTP JSON Response
```

---

## 2. Authoritative Financial Calculation Pipeline

All financial calculations are centralized in `app/core/finance.py` and invoked by `InvoiceService`:

```
Input Line Items: [{quantity: 1.5, unit_rate: 99.99}, ...]
       │
       ▼
For each line item:
  raw_amount = Decimal(str(quantity)) * Decimal(str(unit_rate))
  amount = raw_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
  # Example: 1.5 * 99.99 = 149.985 ──► 149.99
       │
       ▼
subtotal = sum(item.amount for item in items)
       │
       ▼
Compute Discount:
  discount_amount = Decimal(str(discount_amount)) or
                    (subtotal * (discount_percentage / 100)).quantize(...)
       │
       ▼
taxable_base = max(Decimal('0.00'), subtotal - discount_amount)
       │
       ▼
Compute Tax:
  tax_amount = (taxable_base * (tax_percentage / 100)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
       │
       ▼
total_amount = taxable_base + tax_amount
```

**Tampering Guarantee**: Any `subtotal`, `tax_amount`, or `total_amount` values submitted in the client request body are completely discarded. Only backend-calculated values are saved to PostgreSQL.

---

## 3. Public Invoice Flow & Data Sanitization

1. **Unauthenticated Access**: `GET /api/public/invoices/{token}` is explicitly declared without `get_current_user` dependency.
2. **Draft Shielding**:
   ```python
   invoice = db.query(Invoice).filter(Invoice.public_token == token).first()
   if not invoice or invoice.status == "draft":
       raise HTTPException(status_code=404, detail="Invoice not found")
   ```
   Draft invoices remain hidden from public access until explicitly marked as `sent`.
3. **Response Sanitization**:
   The response is serialized through `PublicInvoiceResponse`. This Pydantic model explicitly omits:
   - Database primary keys (`id`, `user_id`, `client_id`, `item_id`)
   - The `public_token` itself
   - Internal merchant audit logs

---

## 4. Concurrent Payment Row-Locking Flow

To guarantee that an invoice cannot be paid twice in concurrent race conditions:

```python
# 1. Start atomic transaction with row lock:
invoice = (
    db.query(Invoice)
    .filter(Invoice.public_token == token)
    .with_for_update()  # PostgreSQL SELECT ... FOR UPDATE
    .first()
)

# 2. Check if already settled:
if invoice.status == "paid":
    raise HTTPException(status_code=400, detail="Invoice is already paid")

# 3. Transition status and timestamp:
invoice.status = "paid"
invoice.paid_at = datetime.now(timezone.utc)

# 4. Commit transaction:
db.commit()
db.refresh(invoice)
```

---

## 5. Multi-Tenant Query Scoping

Every query executed against `clients`, `invoices`, or `business_settings` automatically injects the tenant boundary:

```python
db.query(Invoice).filter(
    Invoice.user_id == current_user.id,
    Invoice.id == invoice_id
).first()
```

If a user requests a record belonging to another user, the filter matches 0 rows, and the service returns `404 Not Found`.
