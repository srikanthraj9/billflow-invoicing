import os
import sys
import uuid
from datetime import date, timedelta, datetime, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import func

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.business_settings import BusinessSettings

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture(scope="module")
def auth_dash_user_a():
    """Register and authenticate User A, returning (token, user_dict)."""
    email = "dash_test_user_a@example.com"
    pwd = "UserAPassword123!"
    client.post("/api/auth/register", json={"full_name": "Dashboard Merchant Alpha", "email": email, "password": pwd})
    log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="module")
def auth_dash_user_b():
    """Register and authenticate User B, returning (token, user_dict)."""
    email = "dash_test_user_b@example.com"
    pwd = "UserBPassword123!"
    client.post("/api/auth/register", json={"full_name": "Dashboard Merchant Beta", "email": email, "password": pwd})
    log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="module")
def auth_dash_user_empty():
    """Register and authenticate a User with zero invoices."""
    email = "dash_test_user_empty@example.com"
    pwd = "UserEmptyPassword123!"
    client.post("/api/auth/register", json={"full_name": "Dashboard Merchant Empty", "email": email, "password": pwd})
    log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="module")
def client_dash_a(auth_dash_user_a):
    """Creates a client belonging to User A."""
    token, _ = auth_dash_user_a
    res = client.post(
        "/api/clients",
        json={"name": "Alpha Corp Client", "email": "contact@alphadash.com", "company": "Alpha Corp Ltd"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    return res.json()


@pytest.fixture(scope="module")
def client_dash_b(auth_dash_user_b):
    """Creates a client belonging to User B."""
    token, _ = auth_dash_user_b
    res = client.post(
        "/api/clients",
        json={"name": "Beta LLC Client", "email": "contact@betadash.com", "company": "Beta LLC"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    return res.json()


@pytest.fixture(autouse=True, scope="module")
def cleanup_dashboard_test_data(db_session: Session):
    """Teardown created test records after tests complete."""
    yield
    test_emails = [
        "dash_test_user_a@example.com",
        "dash_test_user_b@example.com",
        "dash_test_user_empty@example.com",
    ]
    for email in test_emails:
        u = db_session.query(User).filter(func.lower(User.email) == email).first()
        if u:
            db_session.query(InvoiceItem).filter(
                InvoiceItem.invoice_id.in_(
                    db_session.query(Invoice.id).filter(Invoice.user_id == u.id)
                )
            ).delete(synchronize_session=False)
            db_session.query(Invoice).filter(Invoice.user_id == u.id).delete()
            db_session.query(Client).filter(Client.user_id == u.id).delete()
            db_session.query(BusinessSettings).filter(BusinessSettings.user_id == u.id).delete()
            db_session.delete(u)
    db_session.commit()


class TestDashboardStage6:
    # -------------------------------------------------------------
    # A. AUTHENTICATION & AUTHORIZATION (Tests 1–2)
    # -------------------------------------------------------------
    def test_01_unauthenticated_dashboard_returns_401(self):
        """Test 1: Unauthenticated request returns 401."""
        res = client.get("/api/dashboard/stats")
        assert res.status_code == 401

    def test_02_invalid_or_expired_jwt_returns_401(self):
        """Test 2: Request with invalid or forged JWT returns 401."""
        res = client.get(
            "/api/dashboard/stats",
            headers={"Authorization": "Bearer invalid.token.value"},
        )
        assert res.status_code == 401

    # -------------------------------------------------------------
    # B. EMPTY STATE (Test 14)
    # -------------------------------------------------------------
    def test_14_zero_invoice_behavior_empty_state(self, auth_dash_user_empty):
        """Test 14: Zero-invoice user receives HTTP 200 with 0.0 balances, 0 counts, and empty recent list."""
        token, _ = auth_dash_user_empty
        res = client.get(
            "/api/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["totalEarned"] == 0.0
        assert data["totalOutstanding"] == 0.0
        assert data["totalOverdue"] == 0.0
        assert data["totalInvoicesCount"] == 0
        assert data["overdueInvoicesCount"] == 0
        assert data["pendingInvoicesCount"] == 0
        assert data["recentInvoices"] == []
        assert len(data["monthlyIncome"]) == 6
        for point in data["monthlyIncome"]:
            assert point["amount"] == 0.0

    # -------------------------------------------------------------
    # C. OVERDUE & FINANCIAL LOGIC (Tests 7-13, 15-18, 23-25)
    # -------------------------------------------------------------
    def test_overdue_and_kpi_scenarios(
        self, auth_dash_user_a, client_dash_a, db_session: Session
    ):
        """
        Tests 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 23, 24, 25:
        Creates controlled invoices for User A:
        - Invoice A (sent, yesterday): overdue (100.00)
        - Invoice B (sent, tomorrow): pending (200.00)
        - Invoice C (paid, yesterday, paid_at=June 2026): earned (300.00)
        - Invoice D (draft, yesterday): draft (400.00)
        - Invoice E (paid, yesterday, paid_at=June 2026): earned (500.50)
        """
        token_a, user_a = auth_dash_user_a
        yesterday = date.today() - timedelta(days=1)
        tomorrow = date.today() + timedelta(days=1)
        u_id = uuid.UUID(user_a["id"])
        c_id = uuid.UUID(client_dash_a["id"])

        # Invoice A: sent, yesterday (due_date past -> overdue)
        inv_a = Invoice(
            user_id=u_id,
            client_id=c_id,
            invoice_number="DASH-0001",
            status="sent",
            issue_date=yesterday,
            due_date=yesterday,
            subtotal=Decimal("100.00"),
            total=Decimal("100.00"),
        )
        # Invoice B: sent, tomorrow (due_date future -> pending)
        inv_b = Invoice(
            user_id=u_id,
            client_id=c_id,
            invoice_number="DASH-0002",
            status="sent",
            issue_date=date.today(),
            due_date=tomorrow,
            subtotal=Decimal("200.00"),
            total=Decimal("200.00"),
        )
        # Invoice C: paid, yesterday (due_date past -> remains paid, earned)
        # Set paid_at to 2 months ago in current year
        now_utc = datetime.now(timezone.utc)
        target_year = now_utc.year
        target_month = now_utc.month if now_utc.month == 1 else now_utc.month - 1
        paid_dt1 = datetime(target_year, target_month, 10, 12, 0, 0, tzinfo=timezone.utc)

        inv_c = Invoice(
            user_id=u_id,
            client_id=c_id,
            invoice_number="DASH-0003",
            status="paid",
            issue_date=yesterday,
            due_date=yesterday,
            paid_at=paid_dt1,
            subtotal=Decimal("300.00"),
            total=Decimal("300.00"),
        )
        # Invoice D: draft, yesterday (due_date past -> remains draft, excluded)
        inv_d = Invoice(
            user_id=u_id,
            client_id=c_id,
            invoice_number="DASH-0004",
            status="draft",
            issue_date=yesterday,
            due_date=yesterday,
            subtotal=Decimal("400.00"),
            total=Decimal("400.00"),
        )
        # Invoice E: paid, paid_at in same target_month as C (for summing test)
        paid_dt2 = datetime(target_year, target_month, 15, 14, 30, 0, tzinfo=timezone.utc)
        inv_e = Invoice(
            user_id=u_id,
            client_id=c_id,
            invoice_number="DASH-0005",
            status="paid",
            issue_date=yesterday,
            due_date=yesterday,
            paid_at=paid_dt2,
            subtotal=Decimal("500.50"),
            total=Decimal("500.50"),
        )

        db_session.add_all([inv_a, inv_b, inv_c, inv_d, inv_e])
        db_session.commit()

        # Fetch dashboard stats
        res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token_a}"})
        assert res.status_code == 200
        data = res.json()

        # Test 7: Total earned = Invoice C (300.00) + Invoice E (500.50) = 800.50
        assert data["totalEarned"] == 800.50

        # Test 8: Total outstanding = Invoice A (100.00) + Invoice B (200.00) = 300.00
        assert data["totalOutstanding"] == 300.00

        # Test 9, 15: Total overdue = Invoice A (100.00)
        assert data["totalOverdue"] == 100.00
        assert data["overdueInvoicesCount"] == 1

        # Test 16: Pending count = Invoice B (1)
        assert data["pendingInvoicesCount"] == 1

        # Test 10: Paid invoices excluded from outstanding
        # Test 11, 17: Paid invoice C past due date is excluded from overdue
        # Test 12, 18: Draft invoice D past due date is excluded from earned, outstanding, and overdue
        # Test 13: Total invoices count = 5
        assert data["totalInvoicesCount"] == 5

        # Test 25: Multiple payments in target month summed (300.00 + 500.50 = 800.50)
        target_period_str = f"{target_year:04d}-{target_month:02d}"
        target_point = next((p for p in data["monthlyIncome"] if p["period"] == target_period_str), None)
        assert target_point is not None
        assert target_point["amount"] == 800.50

    # -------------------------------------------------------------
    # D. MULTI-TENANT ISOLATION (Tests 3–6, 31, 32)
    # -------------------------------------------------------------
    def test_multi_tenant_isolation(
        self, auth_dash_user_a, auth_dash_user_b, client_dash_b, db_session: Session
    ):
        """
        Tests 3, 4, 5, 6, 31, 32:
        User B adds invoices. Verify User A's dashboard is completely isolated from User B.
        Also test that query param ?user_id=<B> does not affect User A.
        """
        token_a, user_a = auth_dash_user_a
        token_b, user_b = auth_dash_user_b
        u_b_id = uuid.UUID(user_b["id"])
        c_b_id = uuid.UUID(client_dash_b["id"])

        # User B creates a massive invoice
        inv_b = Invoice(
            user_id=u_b_id,
            client_id=c_b_id,
            invoice_number="BETA-9999",
            status="paid",
            issue_date=date.today(),
            due_date=date.today(),
            paid_at=datetime.now(timezone.utc),
            subtotal=Decimal("99999.00"),
            total=Decimal("99999.00"),
        )
        db_session.add(inv_b)
        db_session.commit()

        # User A requests their dashboard
        res_a = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token_a}"})
        data_a = res_a.json()

        # User A's total earned should NOT include 99999.00
        assert data_a["totalEarned"] == 800.50
        # User A's recent invoices must NOT include BETA-9999 or client B
        assert all(inv["invoiceNumber"] != "BETA-9999" for inv in data_a["recentInvoices"])
        assert all(inv["clientName"] != "Beta LLC Client" for inv in data_a["recentInvoices"])

        # Test 31: Attempt user_id tampering via query param
        res_tamper = client.get(
            f"/api/dashboard/stats?user_id={user_b['id']}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        data_tamper = res_tamper.json()
        assert data_tamper["totalEarned"] == 800.50
        assert all(inv["invoiceNumber"] != "BETA-9999" for inv in data_tamper["recentInvoices"])

    # -------------------------------------------------------------
    # E. RECENT INVOICES (Tests 19–22)
    # -------------------------------------------------------------
    def test_recent_invoices_specification(
        self, auth_dash_user_a, client_dash_a, db_session: Session
    ):
        """
        Tests 19, 20, 21, 22:
        - Required fields present
        - Ordered by issue_date DESC, created_at DESC
        - Limited to 5
        - Effective overdue status displayed
        """
        token_a, user_a = auth_dash_user_a
        u_id = uuid.UUID(user_a["id"])
        c_id = uuid.UUID(client_dash_a["id"])

        # Create additional invoices to exceed limit 5
        for i in range(6, 10):
            inv = Invoice(
                user_id=u_id,
                client_id=c_id,
                invoice_number=f"DASH-000{i}",
                status="sent",
                issue_date=date.today() - timedelta(days=i),
                due_date=date.today() + timedelta(days=7),
                subtotal=Decimal("50.00"),
                total=Decimal("50.00"),
            )
            db_session.add(inv)
        db_session.commit()

        res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token_a}"})
        data = res.json()
        recent = data["recentInvoices"]

        # Test 21: Max 5
        assert len(recent) <= 5

        # Test 19: Fields
        first = recent[0]
        assert "id" in first
        assert "invoiceNumber" in first
        assert "clientName" in first
        assert "issueDate" in first
        assert "dueDate" in first
        assert "totalAmount" in first
        assert "status" in first
        assert "currency" in first

        # Test 20: Ordering by issue_date desc
        for i in range(len(recent) - 1):
            assert recent[i]["issueDate"] >= recent[i + 1]["issueDate"]

        # Test 22: Effective status on DASH-0001 (sent past due date -> overdue)
        dash_0001 = next((inv for inv in recent if inv["invoiceNumber"] == "DASH-0001"), None)
        if dash_0001:
            assert dash_0001["status"] == "overdue"

    # -------------------------------------------------------------
    # F. INCOME TIMING & CONTINUOUS TIMELINE (Tests 26–28)
    # -------------------------------------------------------------
    def test_income_over_time_timing_and_empty_months(
        self, auth_dash_user_a, client_dash_a, db_session: Session
    ):
        """
        Tests 24, 26, 27, 28:
        - Invoice issued in April but paid in June appears in June, not April.
        - Empty months return 0.0 with formattedAmount.
        - Timeline forms an unbroken sequence of N months.
        """
        token_a, user_a = auth_dash_user_a
        u_id = uuid.UUID(user_a["id"])
        c_id = uuid.UUID(client_dash_a["id"])

        now_utc = datetime.now(timezone.utc)
        # Create an invoice issued 4 months ago, but paid 1 month ago
        issued_m = now_utc.month - 4 if now_utc.month > 4 else now_utc.month + 8
        issued_y = now_utc.year if now_utc.month > 4 else now_utc.year - 1
        paid_m = now_utc.month - 1 if now_utc.month > 1 else 12
        paid_y = now_utc.year if now_utc.month > 1 else now_utc.year - 1

        inv_timing = Invoice(
            user_id=u_id,
            client_id=c_id,
            invoice_number="DASH-TIMING-1",
            status="paid",
            issue_date=date(issued_y, issued_m, 1),
            due_date=date(issued_y, issued_m, 15),
            paid_at=datetime(paid_y, paid_m, 10, 10, 0, 0, tzinfo=timezone.utc),
            subtotal=Decimal("1000.00"),
            total=Decimal("1000.00"),
        )
        db_session.add(inv_timing)
        db_session.commit()

        res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token_a}"})
        data = res.json()
        chart = data["monthlyIncome"]

        # Test 27: Exactly 6 continuous points
        assert len(chart) == 6

        # Test 28: Income attributed to paid_m, not issued_m
        issued_period = f"{issued_y:04d}-{issued_m:02d}"
        paid_period = f"{paid_y:04d}-{paid_m:02d}"

        paid_pt = next((p for p in chart if p["period"] == paid_period), None)
        assert paid_pt is not None
        assert paid_pt["amount"] >= 1000.00

        # Test 26: Empty months have amount 0.0 and formattedAmount
        empty_pt = next((p for p in chart if p["amount"] == 0.0), None)
        if empty_pt:
            assert isinstance(empty_pt["formattedAmount"], str)
            assert "₹" in empty_pt["formattedAmount"] or "0.00" in empty_pt["formattedAmount"]

    # -------------------------------------------------------------
    # G. PAID_AT INTEGRITY (Test 34)
    # -------------------------------------------------------------
    def test_34_paid_invoice_has_paid_at(
        self, auth_dash_user_a, client_dash_a, db_session: Session
    ):
        """Test 34: Payment transition creates a non-null timezone-aware UTC paid_at timestamp."""
        token_a, _ = auth_dash_user_a
        # 1. Create a sent invoice via API
        create_res = client.post(
            "/api/invoices",
            json={
                "client_id": client_dash_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Paid At Test Item", "quantity": 1.0, "rate": 250.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert create_res.status_code == 201
        inv_data = create_res.json()
        inv_id = inv_data["id"]

        # 2. Transition invoice to paid via update endpoint
        update_res = client.put(
            f"/api/invoices/{inv_id}",
            json={"status": "paid"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert update_res.status_code == 200
        updated_data = update_res.json()
        assert updated_data["status"] == "paid"
        assert updated_data["paid_at"] is not None

        # Verify directly in PostgreSQL
        db_session.expire_all()
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        assert db_inv.status == "paid"
        assert db_inv.paid_at is not None
        assert db_inv.paid_at.tzinfo is not None

    # -------------------------------------------------------------
    # H. NUMERIC JSON SERIALIZATION & QUERY PARAMS (Tests 29, 30)
    # -------------------------------------------------------------
    def test_29_numeric_json_serialization(self, auth_dash_user_a):
        """Test 29: Monetary amounts in API response are JSON numbers (float/int), not strings."""
        token_a, _ = auth_dash_user_a
        res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token_a}"})
        assert res.status_code == 200
        data = res.json()

        # KPIs must be JSON numeric
        assert isinstance(data["totalEarned"], (int, float))
        assert isinstance(data["totalOutstanding"], (int, float))
        assert isinstance(data["totalOverdue"], (int, float))
        assert isinstance(data["totalInvoicesCount"], int)
        assert isinstance(data["overdueInvoicesCount"], int)
        assert isinstance(data["pendingInvoicesCount"], int)

        # Recent invoices totalAmount must be numeric
        for inv in data["recentInvoices"]:
            assert isinstance(inv["totalAmount"], (int, float))

        # Monthly income points amount must be numeric, formattedAmount must be string
        for pt in data["monthlyIncome"]:
            assert isinstance(pt["amount"], (int, float))
            assert isinstance(pt["formattedAmount"], str)

    def test_30_months_query_parameter_validation(self, auth_dash_user_a):
        """Test 30: months query parameter validation (default=6, 12, 1, 0->422, 25->422)."""
        token_a, _ = auth_dash_user_a

        # Default: 6
        res6 = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token_a}"})
        assert len(res6.json()["monthlyIncome"]) == 6

        # 12 months
        res12 = client.get("/api/dashboard/stats?months=12", headers={"Authorization": f"Bearer {token_a}"})
        assert len(res12.json()["monthlyIncome"]) == 12

        # 1 month
        res1 = client.get("/api/dashboard/stats?months=1", headers={"Authorization": f"Bearer {token_a}"})
        assert len(res1.json()["monthlyIncome"]) == 1

        # 0 months -> 422
        res0 = client.get("/api/dashboard/stats?months=0", headers={"Authorization": f"Bearer {token_a}"})
        assert res0.status_code == 422

        # 25 months -> 422
        res25 = client.get("/api/dashboard/stats?months=25", headers={"Authorization": f"Bearer {token_a}"})
        assert res25.status_code == 422

    # -------------------------------------------------------------
    # I. DATABASE ERROR MASKING (Test 33)
    # -------------------------------------------------------------
    def test_33_database_error_masking(self, auth_dash_user_a, monkeypatch):
        """Test 33: Unexpected database failures return sanitized HTTP 500 without leaking SQL or trace."""
        token_a, _ = auth_dash_user_a

        def mock_failing_service(*args, **kwargs):
            raise Exception("FATAL: connection pool corrupted select * from users")

        from app.api import dashboard as dashboard_module
        monkeypatch.setattr(dashboard_module, "get_dashboard_stats", mock_failing_service)

        res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token_a}"})
        assert res.status_code == 500
        detail = res.json()["detail"]
        assert detail == "Failed to retrieve dashboard statistics"
        assert "FATAL" not in detail
        assert "select" not in detail

    # -------------------------------------------------------------
    # J. INCONSISTENT FUTURE-DATED OVERDUE RECORD
    # -------------------------------------------------------------
    def test_inconsistent_future_dated_overdue_record(
        self, auth_dash_user_b, client_dash_b, db_session: Session
    ):
        """
        Explicit test for inconsistent stored record:
        status = "overdue"
        due_date = tomorrow

        Expected:
        - not included in overdue
        - not included in outstanding
        - not included in pending
        """
        token_b, user_b = auth_dash_user_b
        u_b_id = uuid.UUID(user_b["id"])
        c_b_id = uuid.UUID(client_dash_b["id"])
        tomorrow = date.today() + timedelta(days=1)

        # Create an inconsistent invoice with stored status "overdue" but due_date in future
        inconsistent_inv = Invoice(
            user_id=u_b_id,
            client_id=c_b_id,
            invoice_number="INCONSISTENT-001",
            status="overdue",
            issue_date=date.today(),
            due_date=tomorrow,
            subtotal=Decimal("777.00"),
            total=Decimal("777.00"),
        )
        db_session.add(inconsistent_inv)
        db_session.commit()

        res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token_b}"})
        assert res.status_code == 200
        data = res.json()

        # Expected:
        # - not included in overdue
        # - not included in outstanding
        # - not included in pending
        assert data["totalOverdue"] == 0.0
        assert data["overdueInvoicesCount"] == 0
        assert data["totalOutstanding"] == 0.0
        assert data["pendingInvoicesCount"] == 0


if __name__ == "__main__":
    pytest.main(["-v", __file__])

