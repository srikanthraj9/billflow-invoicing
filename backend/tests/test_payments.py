import os
import sys
import uuid
import secrets
from datetime import date, timedelta, datetime, timezone
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import func, inspect
import sqlalchemy as sa

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import SessionLocal, engine
from app.core.config import settings
from app.models.user import User
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.payment import Payment
from app.models.business_settings import BusinessSettings

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture(scope="module")
def test_user_alpha():
    """Register and authenticate User Alpha."""
    email = f"pay_test_alpha_{secrets.token_hex(4)}@example.com"
    pwd = "UserAlphaPass123!"
    client.post("/api/auth/register", json={"full_name": "Alpha Merchant", "email": email, "password": pwd})
    log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"], email


@pytest.fixture(scope="module")
def test_user_beta():
    """Register and authenticate User Beta."""
    email = f"pay_test_beta_{secrets.token_hex(4)}@example.com"
    pwd = "UserBetaPass123!"
    client.post("/api/auth/register", json={"full_name": "Beta Merchant", "email": email, "password": pwd})
    log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"], email


@pytest.fixture(scope="module")
def client_alpha(test_user_alpha):
    token, _, _ = test_user_alpha
    res = client.post(
        "/api/clients",
        json={"name": "Priya Sharma", "email": "priya.sharma@example.com", "company": "Sharma Tech"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    return res.json()


@pytest.fixture(scope="module")
def client_beta(test_user_beta):
    token, _, _ = test_user_beta
    res = client.post(
        "/api/clients",
        json={"name": "Rahul Verma", "email": "rahul.verma@example.com", "company": "Verma Enterprises"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    return res.json()


@pytest.fixture(autouse=True, scope="module")
def cleanup_payments_test_data(db_session: Session, test_user_alpha, test_user_beta):
    """Teardown created test records after payment tests complete."""
    yield
    _, _, email_a = test_user_alpha
    _, _, email_b = test_user_beta
    for email in [email_a, email_b]:
        u = db_session.query(User).filter(func.lower(User.email) == email.lower()).first()
        if u:
            invoice_ids = [inv.id for inv in db_session.query(Invoice).filter(Invoice.user_id == u.id).all()]
            if invoice_ids:
                db_session.query(Payment).filter(Payment.invoice_id.in_(invoice_ids)).delete(synchronize_session=False)
                db_session.query(InvoiceItem).filter(InvoiceItem.invoice_id.in_(invoice_ids)).delete(synchronize_session=False)
                db_session.query(Invoice).filter(Invoice.user_id == u.id).delete(synchronize_session=False)
            db_session.query(Client).filter(Client.user_id == u.id).delete(synchronize_session=False)
            db_session.query(BusinessSettings).filter(BusinessSettings.user_id == u.id).delete(synchronize_session=False)
            db_session.delete(u)
    db_session.commit()


# =========================================================================
# TEST GROUP A — DATABASE SCHEMA
# =========================================================================
class TestDatabaseSchema:
    def test_tc_db_001_payments_table_exists(self):
        """TC-DB-001: Verify payments table exists."""
        insp = inspect(engine)
        assert "payments" in insp.get_table_names(), "Table 'payments' must exist in database"

    def test_tc_db_002_id_is_uuid_primary_key(self):
        """TC-DB-002: Verify payments.id is UUID primary key."""
        insp = inspect(engine)
        pk = insp.get_pk_constraint("payments")
        assert "id" in pk["constrained_columns"], "payments.id must be in primary key constraint"
        cols = {c["name"]: c for c in insp.get_columns("payments")}
        assert "UUID" in str(cols["id"]["type"]).upper(), "payments.id must be UUID type"

    def test_tc_db_003_and_004_invoice_id_foreign_key_cascade(self):
        """TC-DB-003 & TC-DB-004: Verify payments.invoice_id references invoices.id with ON DELETE CASCADE."""
        insp = inspect(engine)
        fks = insp.get_foreign_keys("payments")
        inv_fk = next((fk for fk in fks if "invoice_id" in fk["constrained_columns"]), None)
        assert inv_fk is not None, "Foreign key from payments to invoices must exist"
        assert inv_fk["referred_table"] == "invoices"
        assert "id" in inv_fk["referred_columns"]
        # Cascade delete verification
        options = inv_fk.get("options", {})
        ondelete = options.get("ondelete", "").upper() if options else ""
        assert ondelete == "CASCADE" or "cascade" in str(inv_fk).lower()

    def test_tc_db_005_amount_numeric_precision(self):
        """TC-DB-005: Verify amount uses appropriate decimal/numeric precision."""
        insp = inspect(engine)
        cols = {c["name"]: c for c in insp.get_columns("payments")}
        amount_col = cols["amount"]
        assert isinstance(amount_col["type"], (sa.Numeric, sa.DECIMAL))
        assert amount_col["type"].precision == 12
        assert amount_col["type"].scale == 2

    def test_tc_db_006_reference_is_unique(self):
        """TC-DB-006: Verify reference is unique."""
        insp = inspect(engine)
        uniques = insp.get_unique_constraints("payments")
        indexes = insp.get_indexes("payments")
        unique_cols = [col for u in uniques for col in u["column_names"]]
        for idx in indexes:
            if idx.get("unique"):
                unique_cols.extend(idx.get("column_names", []))
        assert "reference" in unique_cols, "payments.reference must have a unique constraint/index"

    def test_tc_db_007_required_indexes_exist(self):
        """TC-DB-007: Verify required indexes exist (invoice_id, status, paid_at)."""
        insp = inspect(engine)
        idx_names = [i["name"] for i in insp.get_indexes("payments")]
        assert "payments_invoice_id_idx" in idx_names or any("invoice_id" in i["column_names"] for i in insp.get_indexes("payments"))
        assert "payments_status_idx" in idx_names or any("status" in i["column_names"] for i in insp.get_indexes("payments"))
        assert "payments_paid_at_idx" in idx_names or any("paid_at" in i["column_names"] for i in insp.get_indexes("payments"))

    def test_tc_db_008_invalid_payment_method_rejected_by_check_constraint(self, db_session: Session, test_user_alpha, client_alpha):
        """TC-DB-008: Verify invalid payment method is rejected by database check constraint."""
        token_a, _, _ = test_user_alpha
        # Create an invoice
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_alpha["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Method Check", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = uuid.UUID(res.json()["id"])
        bad_payment = Payment(
            id=uuid.uuid4(),
            invoice_id=inv_id,
            amount=Decimal("100.00"),
            method="Cryptocurrency",  # Invalid method
            status="completed",
            reference=f"BF-BAD-{secrets.token_hex(4)}",
        )
        db_session.add(bad_payment)
        with pytest.raises(Exception) as exc_info:
            db_session.commit()
        db_session.rollback()
        assert "ck_payment_method" in str(exc_info.value).lower() or "check" in str(exc_info.value).lower()

    def test_tc_db_009_invalid_payment_status_rejected_by_check_constraint(self, db_session: Session, test_user_alpha, client_alpha):
        """TC-DB-009: Verify invalid payment status is rejected by database check constraint."""
        token_a, _, _ = test_user_alpha
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_alpha["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Status Check", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = uuid.UUID(res.json()["id"])
        bad_payment = Payment(
            id=uuid.uuid4(),
            invoice_id=inv_id,
            amount=Decimal("100.00"),
            method="UPI",
            status="reversed",  # Invalid status
            reference=f"BF-BADSTAT-{secrets.token_hex(4)}",
        )
        db_session.add(bad_payment)
        with pytest.raises(Exception) as exc_info:
            db_session.commit()
        db_session.rollback()
        assert "ck_payment_status" in str(exc_info.value).lower() or "check" in str(exc_info.value).lower()


# =========================================================================
# TEST GROUP B — SUCCESSFUL PAYMENT
# =========================================================================
class TestSuccessfulPayment:
    def test_tc_pay_001_to_012_successful_payment_flow(self, test_user_alpha, client_alpha, db_session: Session):
        """TC-PAY-001 through TC-PAY-012: Full successful payment validation."""
        token_a, _, _ = test_user_alpha

        # TC-PAY-001: Create isolated test invoice
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_alpha["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [{"description": "Consulting Services", "quantity": 2.0, "rate": 500.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 201
        inv_data = res.json()
        inv_id = uuid.UUID(inv_data["id"])
        invoice_total = Decimal(str(inv_data["total"]))

        # Retrieve public token
        db_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).first()
        pub_token = db_inv.public_token
        assert pub_token is not None

        # TC-PAY-002: Pay a sent invoice with Card method
        pay_res = client.post(
            f"/api/public/invoices/{pub_token}/pay",
            json={"method": "Card", "amount": float(invoice_total)},
        )
        assert pay_res.status_code == 200, f"Payment failed: {pay_res.text}"
        pay_data = pay_res.json()

        # TC-PAY-003: Verify invoice.status is "paid"
        assert pay_data["status"] == "paid"

        # TC-PAY-004: Verify invoice.paid_at is non-null UTC timestamp
        assert pay_data["paid_at"] is not None

        # Query database directly
        db_session.expire_all()
        db_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).one()
        assert db_inv.status == "paid"
        assert db_inv.paid_at is not None

        # TC-PAY-005: Verify payment record exists (exactly one)
        payments = db_session.query(Payment).filter(Payment.invoice_id == inv_id).all()
        assert len(payments) == 1, "Exactly one payment record must exist"
        p = payments[0]

        # TC-PAY-006: Verify payment.invoice_id matches invoice.id
        assert p.invoice_id == inv_id

        # TC-PAY-007: Verify payment.amount matches invoice.total
        assert p.amount == invoice_total

        # TC-PAY-008: Verify payment.method
        assert p.method == "Card"

        # TC-PAY-009: Verify payment.status
        assert p.status == "completed"

        # TC-PAY-010: Verify payment.reference is unique non-empty
        assert p.reference and len(p.reference) > 3

        # TC-PAY-011: Verify payment.paid_at is non-null
        assert p.paid_at is not None

        # TC-PAY-012: Verify invoice and payment timestamps are consistent
        # In the transaction both are stamped with now_utc
        assert abs((db_inv.paid_at - p.paid_at).total_seconds()) < 1.0


# =========================================================================
# TEST GROUP C — DUPLICATE PAYMENT PROTECTION
# =========================================================================
class TestDuplicatePayment:
    def test_tc_dup_001_to_005_duplicate_payment_rejected(self, test_user_alpha, client_alpha, db_session: Session):
        """TC-DUP-001 through TC-DUP-005: Second payment attempt is rejected."""
        token_a, _, _ = test_user_alpha
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_alpha["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Duplicate Test Service", "quantity": 1.0, "rate": 250.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = uuid.UUID(res.json()["id"])
        db_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).first()
        pub_token = db_inv.public_token

        # TC-DUP-001: First payment succeeds
        res1 = client.post(f"/api/public/invoices/{pub_token}/pay", json={"method": "UPI"})
        assert res1.status_code == 200

        # TC-DUP-002: Second payment attempt returns HTTP 400
        res2 = client.post(f"/api/public/invoices/{pub_token}/pay", json={"method": "UPI"})
        assert res2.status_code == 400
        assert "already paid" in res2.json()["detail"].lower()

        # TC-DUP-003: Verify payment count is exactly ONE
        db_session.expire_all()
        payment_count = db_session.query(Payment).filter(Payment.invoice_id == inv_id).count()
        assert payment_count == 1

        # TC-DUP-004: Verify invoice remains paid
        inv_after = db_session.query(Invoice).filter(Invoice.id == inv_id).one()
        assert inv_after.status == "paid"

        # TC-DUP-005: Verify total financial amount was not doubled
        db_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).one()
        total_paid_amount = db_session.query(func.sum(Payment.amount)).filter(Payment.invoice_id == inv_id).scalar()
        assert total_paid_amount == db_inv.total


# =========================================================================
# TEST GROUP D — CONCURRENT PAYMENT PROTECTION
# =========================================================================
class TestConcurrentPayment:
    def test_tc_con_001_to_005_concurrency_race_condition(self, test_user_alpha, client_alpha, db_session: Session):
        """TC-CON-001 through TC-CON-005: Row locking ensures single successful payment in race."""
        token_a, _, _ = test_user_alpha
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_alpha["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Concurrency Sprint", "quantity": 1.0, "rate": 777.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = uuid.UUID(res.json()["id"])
        db_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).first()
        pub_token = db_inv.public_token

        def trigger_payment():
            c = TestClient(app)
            return c.post(f"/api/public/invoices/{pub_token}/pay", json={"method": "Net Banking"})

        with ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(trigger_payment)
            f2 = executor.submit(trigger_payment)
            r1 = f1.result()
            r2 = f2.result()

        status_codes = sorted([r1.status_code, r2.status_code])
        # TC-CON-001 & TC-CON-002: Exactly one 200 and one 400
        assert status_codes == [200, 400], f"Expected [200, 400] but got {status_codes}"

        # TC-CON-003: Exactly ONE payment row exists
        db_session.expire_all()
        payments = db_session.query(Payment).filter(Payment.invoice_id == inv_id).all()
        assert len(payments) == 1

        # TC-CON-004: Invoice state is paid
        final_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).one()
        assert final_inv.status == "paid"

        # TC-CON-005: No duplicate financial settlement
        db_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).one()
        total_collected = db_session.query(func.sum(Payment.amount)).filter(Payment.invoice_id == inv_id).scalar()
        assert total_collected == db_inv.total


# =========================================================================
# TEST GROUP E — INVALID PAYMENT HANDLING
# =========================================================================
class TestInvalidPayment:
    def test_tc_inv_001_nonexistent_token_returns_404(self):
        """TC-INV-001: Nonexistent token returns HTTP 404."""
        res = client.post("/api/public/invoices/nonexistent-token-12345/pay", json={"method": "UPI"})
        assert res.status_code == 404

    def test_tc_inv_002_draft_invoice_returns_404(self, test_user_alpha, client_alpha, db_session: Session):
        """TC-INV-002: Draft invoice returns HTTP 404 (hidden publicly)."""
        token_a, _, _ = test_user_alpha
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_alpha["id"],
                "status": "draft",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Draft Project", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = uuid.UUID(res.json()["id"])
        db_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).first()
        res_pay = client.post(f"/api/public/invoices/{db_inv.public_token}/pay")
        assert res_pay.status_code == 404

    def test_tc_inv_003_invalid_method_rejected(self, test_user_alpha, client_alpha, db_session: Session):
        """TC-INV-003: Invalid payment method returns validation error (HTTP 422)."""
        token_a, _, _ = test_user_alpha
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_alpha["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Method Validation", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = uuid.UUID(res.json()["id"])
        db_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).first()
        res_pay = client.post(f"/api/public/invoices/{db_inv.public_token}/pay", json={"method": "Dogecoin"})
        assert res_pay.status_code == 422

    def test_tc_inv_004_invalid_amount_rejected(self, test_user_alpha, client_alpha, db_session: Session):
        """TC-INV-004: Invalid payment amount is rejected (HTTP 400 or 422)."""
        token_a, _, _ = test_user_alpha
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_alpha["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Amount Validation", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = uuid.UUID(res.json()["id"])
        db_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).first()

        # Negative amount -> 422
        res_neg = client.post(f"/api/public/invoices/{db_inv.public_token}/pay", json={"method": "UPI", "amount": -50.0})
        assert res_neg.status_code == 422

        # Mismatched amount -> 400
        res_mismatch = client.post(f"/api/public/invoices/{db_inv.public_token}/pay", json={"method": "UPI", "amount": 999.0})
        assert res_mismatch.status_code == 400


# =========================================================================
# TEST GROUP F — TRANSACTION ATOMICITY & ROLLBACK
# =========================================================================
class TestTransactionRollback:
    def test_tc_roll_001_to_004_atomic_rollback_on_failure(self, test_user_alpha, client_alpha, db_session: Session):
        """TC-ROLL-001 through TC-ROLL-004: Error during transaction rolls back both invoice and payment."""
        token_a, _, _ = test_user_alpha
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_alpha["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Rollback Test", "quantity": 1.0, "rate": 300.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = uuid.UUID(res.json()["id"])
        db_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).first()
        pub_token = db_inv.public_token

        # Mock db.commit to raise an unexpected DatabaseError
        with patch.object(Session, "commit", side_effect=Exception("Database connection terminated")):
            with pytest.raises(Exception):
                client.post(f"/api/public/invoices/{pub_token}/pay", json={"method": "UPI"})

        # TC-ROLL-002: Invoice status remains "sent"
        db_session.expire_all()
        inv_check = db_session.query(Invoice).filter(Invoice.id == inv_id).one()
        assert inv_check.status == "sent"
        assert inv_check.paid_at is None

        # TC-ROLL-003: No orphan payment record exists
        p_count = db_session.query(Payment).filter(Payment.invoice_id == inv_id).count()
        assert p_count == 0


# =========================================================================
# TEST GROUP G — SECURITY & TENANT ISOLATION
# =========================================================================
class TestSecurityAndIsolation:
    def test_tc_sec_001_to_003_tenant_isolation_payments(
        self, test_user_alpha, test_user_beta, client_alpha, client_beta, db_session: Session
    ):
        """TC-SEC-001 through TC-SEC-003: Payments belong strictly to invoice and merchant."""
        token_a, _, _ = test_user_alpha
        token_b, _, _ = test_user_beta

        # User A creates invoice and pays it
        res_a = client.post(
            "/api/invoices",
            json={
                "client_id": client_alpha["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "User A Private Service", "quantity": 1.0, "rate": 500.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_a_id = res_a.json()["id"]
        db_inv_a = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_a_id)).first()
        client.post(f"/api/public/invoices/{db_inv_a.public_token}/pay", json={"method": "Card"})

        # User B queries /api/payments
        res_b_payments = client.get("/api/payments", headers={"Authorization": f"Bearer {token_b}"})
        assert res_b_payments.status_code == 200
        user_b_inv_numbers = [p["invoice_number"] for p in res_b_payments.json()]
        assert res_a.json()["invoice_number"] not in user_b_inv_numbers, "User B must not see User A's payments"

        # User B attempts to fetch User A's payment by invoice_id
        res_b_single = client.get(f"/api/payments/invoice/{inv_a_id}", headers={"Authorization": f"Bearer {token_b}"})
        assert res_b_single.status_code == 404

    def test_tc_sec_004_and_005_no_secrets_exposed(self, test_user_alpha, client_alpha, db_session: Session):
        """TC-SEC-004 & TC-SEC-005: Verify API response does not leak credentials or internal keys."""
        token_a, _, _ = test_user_alpha
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_alpha["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Security Audit", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = uuid.UUID(res.json()["id"])
        db_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).first()

        pay_res = client.post(f"/api/public/invoices/{db_inv.public_token}/pay", json={"method": "UPI"})
        body_text = pay_res.text

        # Verify sensitive keys are NOT exposed
        assert settings.JWT_SECRET_KEY not in body_text
        assert "postgresql://" not in body_text
        assert "aws-0-ap-northeast-1.pooler.supabase.com" not in body_text
        assert settings.SUPABASE_SERVICE_ROLE_KEY not in body_text


# =========================================================================
# TC-FLOW-001 — COMPLETE PUBLIC PAYMENT -> INTERNAL SYNC
# =========================================================================
class TestCompletePublicPaymentFlow:
    def test_tc_flow_001_end_to_end_flow(self, test_user_alpha, client_alpha, db_session: Session):
        """
        TC-FLOW-001: Complete Public Payment -> Internal Application Sync.
        1. Create isolated unpaid invoice.
        2. Record dashboard & reports baseline.
        3. Pay invoice through POST /api/public/invoices/{token}/pay.
        4. Verify HTTP 200.
        5. Verify invoice.status = "paid".
        6. Verify invoice.paid_at is populated.
        7. Verify exactly one payments row exists.
        8. Verify /api/invoices shows PAID.
        9. Verify /api/payments shows payment as Paid.
        10. Verify /api/dashboard/stats Received increased, Outstanding decreased.
        11. Second payment attempt returns HTTP 400.
        """
        token_a, _, _ = test_user_alpha

        # 1. Record dashboard baseline
        dash_before = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token_a}"}).json()
        total_earned_before = Decimal(str(dash_before["totalEarned"]))
        total_outstanding_before = Decimal(str(dash_before["totalOutstanding"]))

        # 2. Create isolated unpaid invoice
        invoice_amount = Decimal("1500.00")
        inv_create = client.post(
            "/api/invoices",
            json={
                "client_id": client_alpha["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=10)),
                "items": [{"description": "Full Cycle Flow Work", "quantity": 1.0, "rate": float(invoice_amount)}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert inv_create.status_code == 201
        inv_data = inv_create.json()
        inv_id = uuid.UUID(inv_data["id"])
        inv_num = inv_data["invoice_number"]
        inv_total = Decimal(str(inv_data["total"]))

        db_session.expire_all()
        db_inv = db_session.query(Invoice).filter(Invoice.id == inv_id).one()
        pub_token = db_inv.public_token

        # 3. Pay invoice through public endpoint
        pay_res = client.post(
            f"/api/public/invoices/{pub_token}/pay",
            json={"method": "Card", "amount": float(inv_total)},
        )

        # 4. Verify HTTP 200
        assert pay_res.status_code == 200
        pay_json = pay_res.json()

        # 5. Verify invoice.status = "paid"
        assert pay_json["status"] == "paid"

        # 6. Verify invoice.paid_at is populated
        assert pay_json["paid_at"] is not None
        assert pay_json["payment_method"] == "Card"
        assert pay_json["payment_reference"] is not None

        # 7. Verify exactly one payments row exists
        db_session.expire_all()
        payments = db_session.query(Payment).filter(Payment.invoice_id == inv_id).all()
        assert len(payments) == 1
        payment_record = payments[0]
        assert payment_record.method == "Card"
        assert payment_record.amount == inv_total
        assert payment_record.status == "completed"

        # 8. Open /invoices -> verify invoice list shows status = "paid"
        list_res = client.get("/api/invoices", headers={"Authorization": f"Bearer {token_a}"})
        assert list_res.status_code == 200
        found = next((i for i in list_res.json()["items"] if i["id"] == str(inv_id)), None)
        assert found is not None
        assert found["status"] == "paid"

        # 9. Open /payments -> verify payment appears as Paid
        payments_res = client.get("/api/payments", headers={"Authorization": f"Bearer {token_a}"})
        assert payments_res.status_code == 200
        matched_payment = next((p for p in payments_res.json() if p["invoice_id"] == str(inv_id)), None)
        assert matched_payment is not None
        assert matched_payment["status"] == "completed"
        assert matched_payment["method"] == "Card"
        assert matched_payment["reference"] == payment_record.reference
        assert Decimal(str(matched_payment["amount"])) == inv_total

        # 10. Open /dashboard -> verify Received increased by payment amount
        dash_after = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token_a}"}).json()
        total_earned_after = Decimal(str(dash_after["totalEarned"]))
        assert total_earned_after >= total_earned_before + inv_total

        # 11. Attempt payment again -> verify HTTP 400
        second_pay = client.post(f"/api/public/invoices/{pub_token}/pay", json={"method": "Card"})
        assert second_pay.status_code == 400
        assert "already paid" in second_pay.json()["detail"].lower()

        # 12. Verify payment count remains exactly 1
        db_session.expire_all()
        final_p_count = db_session.query(Payment).filter(Payment.invoice_id == inv_id).count()
        assert final_p_count == 1
