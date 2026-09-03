import os
import sys
import uuid
import secrets
from datetime import date, timedelta, datetime
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
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
def auth_user_pub_a():
    """Register and authenticate User A, returning (token, user_dict)."""
    email = "pub_test_user_a@example.com"
    pwd = "UserAPassword123!"
    client.post("/api/auth/register", json={"full_name": "Public Portal Merchant Alpha", "email": email, "password": pwd})
    log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="module")
def auth_user_pub_b():
    """Register and authenticate User B, returning (token, user_dict)."""
    email = "pub_test_user_b@example.com"
    pwd = "UserBPassword123!"
    client.post("/api/auth/register", json={"full_name": "Public Portal Merchant Beta", "email": email, "password": pwd})
    log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="module")
def client_pub_a(auth_user_pub_a):
    """Creates a client belonging to User A."""
    token, _ = auth_user_pub_a
    res = client.post(
        "/api/clients",
        json={"name": "Alpha Client Corp", "email": "contact@alphacorp.com", "company": "Alpha Corp", "address": "100 Alpha St"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    return res.json()


@pytest.fixture(scope="module")
def client_pub_b(auth_user_pub_b):
    """Creates a client belonging to User B."""
    token, _ = auth_user_pub_b
    res = client.post(
        "/api/clients",
        json={"name": "Beta Client LLC", "email": "contact@betallc.com", "company": "Beta LLC", "address": "200 Beta Blvd"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    return res.json()


@pytest.fixture(autouse=True, scope="module")
def cleanup_public_test_data(db_session: Session):
    """Teardown created test records after tests complete."""
    yield
    test_emails = ["pub_test_user_a@example.com", "pub_test_user_b@example.com"]
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


class TestPublicInvoicesStage5:
    def test_01_token_urlsafe_generation(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """Test 27: Newly created invoices receive a secure token_urlsafe token (43 chars, urlsafe)."""
        token_a, _ = auth_user_pub_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [{"description": "Web Development", "quantity": 1.0, "rate": 1500.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 201
        inv_data = res.json()
        inv_id = inv_data["id"]

        # Verify in DB that public_token is generated via secrets.token_urlsafe(32) (length 43)
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        assert db_inv is not None
        assert db_inv.public_token is not None
        assert len(db_inv.public_token) == 43
        # Should only contain URL-safe characters
        assert all(c.isalnum() or c in "-_" for c in db_inv.public_token)

    def test_02_valid_sent_invoice_public_get(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """Tests 1, 4: Valid sent invoice returns 200 OK without JWT or Authorization header."""
        token_a, _ = auth_user_pub_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "notes": "Payment due within 7 days",
                "items": [{"description": "Design Consultation", "quantity": 2.0, "rate": 250.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        pub_token = db_inv.public_token

        # Unauthenticated GET
        pub_res = client.get(f"/api/public/invoices/{pub_token}")
        assert pub_res.status_code == 200
        data = pub_res.json()
        assert data["invoice_number"] == res.json()["invoice_number"]
        assert data["status"] == "sent"
        assert data["subtotal"] == "500.00"
        assert data["total"] == "500.00"
        assert data["notes"] == "Payment due within 7 days"

    def test_03_invalid_and_random_token_returns_404(self):
        """Tests 2, 3: Invalid and cryptographically random nonexistent tokens return HTTP 404."""
        # 1. Invalid short token
        res1 = client.get("/api/public/invoices/invalid-short-token")
        assert res1.status_code == 404
        assert res1.json()["detail"] == "Invoice not found"

        # 2. Random valid-looking token_urlsafe token that does not exist
        random_token = secrets.token_urlsafe(32)
        res2 = client.get(f"/api/public/invoices/{random_token}")
        assert res2.status_code == 404
        assert res2.json()["detail"] == "Invoice not found"

    def test_04_draft_invoice_hidden_publicly(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """Test 5: Draft invoices return HTTP 404 to protect unpublished merchant data."""
        token_a, _ = auth_user_pub_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "draft",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Draft Scope", "quantity": 1.0, "rate": 300.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        pub_token = db_inv.public_token

        # Public access should be 404
        pub_res = client.get(f"/api/public/invoices/{pub_token}")
        assert pub_res.status_code == 404
        assert pub_res.json()["detail"] == "Invoice not found"

    def test_05_privacy_excluded_fields(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """
        Tests 6, 7, 8, 9, 10, 28:
        Public response strictly excludes:
        - user_id
        - invoice.id
        - client.id
        - item.id / item.invoice_id
        - public_token in JSON body
        - business_settings.id
        """
        token_a, user_a = auth_user_pub_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=5)),
                "items": [{"description": "Security Audit", "quantity": 1.0, "rate": 2000.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        pub_token = db_inv.public_token

        pub_res = client.get(f"/api/public/invoices/{pub_token}")
        assert pub_res.status_code == 200
        data = pub_res.json()

        # Check invoice level exclusions
        assert "user_id" not in data
        assert "id" not in data
        assert "client_id" not in data
        assert "public_token" not in data  # URL has the token; JSON body excludes it

        # Check client level exclusions
        assert "id" not in data["client"]
        assert "user_id" not in data["client"]

        # Check item level exclusions
        for it in data["items"]:
            assert "id" not in it
            assert "invoice_id" not in it

        # Check business level exclusions
        assert "id" not in data["business"]
        assert "user_id" not in data["business"]

    def test_06_required_fields_and_business_data(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """
        Tests 11, 12, 13:
        Public response contains required invoice fields, line items, and merchant business details.
        """
        token_a, _ = auth_user_pub_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=10)),
                "notes": "Thank you for your business!",
                "discount_percentage": 10.0,
                "tax_percentage": 18.0,
                "items": [
                    {"description": "Branding Package", "quantity": 1.0, "rate": 1000.0},
                    {"description": "Asset Export", "quantity": 2.0, "rate": 100.0},
                ],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        pub_token = db_inv.public_token

        pub_res = client.get(f"/api/public/invoices/{pub_token}")
        assert pub_res.status_code == 200
        data = pub_res.json()

        # Invoice fields
        assert "invoice_number" in data
        assert data["status"] == "sent"
        assert data["issue_date"] == str(date.today())
        assert data["due_date"] == str(date.today() + timedelta(days=10))
        assert data["subtotal"] == "1200.00"
        assert data["discount"] == "120.00"
        assert data["tax"] == "194.40"
        assert data["total"] == "1274.40"
        assert data["paid_at"] is None

        # Line items
        assert len(data["items"]) == 2
        assert data["items"][0]["description"] == "Branding Package"
        assert data["items"][0]["amount"] == "1000.00"
        assert data["items"][1]["description"] == "Asset Export"
        assert data["items"][1]["amount"] == "200.00"

        # Client details
        assert data["client"]["name"] == "Alpha Client Corp"
        assert data["client"]["email"] == "contact@alphacorp.com"
        assert data["client"]["address"] == "100 Alpha St"

        # Business details
        assert "business_name" in data["business"]
        assert "business_email" in data["business"]
        assert data["business"]["currency"] == "INR"

    def test_07_sent_invoice_payment(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """
        Tests 14, 19, 20:
        Sent invoice payment succeeds, sets status = paid, sets paid_at timestamp.
        """
        token_a, _ = auth_user_pub_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [{"description": "Monthly Retainer", "quantity": 1.0, "rate": 3000.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        pub_token = db_inv.public_token

        # Unauthenticated payment POST
        pay_res = client.post(f"/api/public/invoices/{pub_token}/pay")
        assert pay_res.status_code == 200
        pay_data = pay_res.json()
        assert pay_data["status"] == "paid"
        assert pay_data["paid_at"] is not None

        # Verify datetime parsing
        parsed = datetime.fromisoformat(pay_data["paid_at"].replace("Z", "+00:00"))
        assert parsed is not None

        # Verify in DB
        db_session.expire_all()
        reloaded = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        assert reloaded.status == "paid"
        assert reloaded.paid_at is not None

    def test_08_overdue_invoice_payment(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """
        Tests 15, 22:
        Overdue invoice (sent + past due date) displays 'overdue' and can be paid.
        """
        token_a, _ = auth_user_pub_a
        past_issue = date.today() - timedelta(days=20)
        past_due = date.today() - timedelta(days=5)
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(past_issue),
                "due_date": str(past_due),
                "items": [{"description": "Overdue Deliverable", "quantity": 1.0, "rate": 800.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        pub_token = db_inv.public_token

        # Check public GET shows 'overdue'
        get_res = client.get(f"/api/public/invoices/{pub_token}")
        assert get_res.status_code == 200
        assert get_res.json()["status"] == "overdue"

        # Pay overdue invoice
        pay_res = client.post(f"/api/public/invoices/{pub_token}/pay")
        assert pay_res.status_code == 200
        assert pay_res.json()["status"] == "paid"
        assert pay_res.json()["paid_at"] is not None

    def test_09_paid_invoice_cannot_be_paid_again(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """Test 16: Attempting to pay an already paid invoice returns HTTP 400."""
        token_a, _ = auth_user_pub_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "One-time Service", "quantity": 1.0, "rate": 500.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        pub_token = db_inv.public_token

        # First payment succeeds
        first_pay = client.post(f"/api/public/invoices/{pub_token}/pay")
        assert first_pay.status_code == 200
        initial_paid_at = first_pay.json()["paid_at"]

        # Second payment rejected
        second_pay = client.post(f"/api/public/invoices/{pub_token}/pay")
        assert second_pay.status_code == 400
        assert "invoice is already paid" in second_pay.json()["detail"].lower()

        # Check that paid_at was not overwritten
        get_res = client.get(f"/api/public/invoices/{pub_token}")
        assert get_res.json()["paid_at"] == initial_paid_at

    def test_10_draft_and_invalid_token_payment_returns_404(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """Tests 17, 18: Payment on draft invoice or invalid token returns HTTP 404."""
        # 1. Invalid token
        res1 = client.post("/api/public/invoices/nonexistent-token-12345/pay")
        assert res1.status_code == 404
        assert res1.json()["detail"] == "Invoice not found"

        # 2. Draft invoice payment attempt
        token_a, _ = auth_user_pub_a
        draft_res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "draft",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Draft Work", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = draft_res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        pub_token = db_inv.public_token

        pay_draft = client.post(f"/api/public/invoices/{pub_token}/pay")
        assert pay_draft.status_code == 404
        assert pay_draft.json()["detail"] == "Invoice not found"

    def test_11_paid_invoice_remains_paid_past_due_date(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """Test 21: Paid invoice with past due date returns status 'paid', never 'overdue'."""
        token_a, _ = auth_user_pub_a
        past_issue = date.today() - timedelta(days=30)
        past_due = date.today() - timedelta(days=10)
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(past_issue),
                "due_date": str(past_due),
                "items": [{"description": "Historical invoice", "quantity": 1.0, "rate": 450.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        pub_token = db_inv.public_token

        # Pay invoice
        client.post(f"/api/public/invoices/{pub_token}/pay")

        # GET invoice
        get_res = client.get(f"/api/public/invoices/{pub_token}")
        assert get_res.status_code == 200
        assert get_res.json()["status"] == "paid"

    def test_12_payment_isolation_across_invoices_and_users(
        self, auth_user_pub_a, auth_user_pub_b, client_pub_a, client_pub_b, db_session: Session
    ):
        """Tests 23, 24: Payment of Invoice A does not affect Invoice B or another user's invoice."""
        token_a, _ = auth_user_pub_a
        token_b, _ = auth_user_pub_b

        # User A creates Invoice A1 and A2
        res_a1 = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "User A Task 1", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        res_a2 = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "User A Task 2", "quantity": 1.0, "rate": 200.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )

        # User B creates Invoice B1
        res_b1 = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_b["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "User B Task 1", "quantity": 1.0, "rate": 300.0}],
            },
            headers={"Authorization": f"Bearer {token_b}"},
        )

        db_a1 = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(res_a1.json()["id"])).first()
        db_a2 = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(res_a2.json()["id"])).first()
        db_b1 = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(res_b1.json()["id"])).first()

        # Pay A1 only
        client.post(f"/api/public/invoices/{db_a1.public_token}/pay")

        # Verify A1 is paid
        assert client.get(f"/api/public/invoices/{db_a1.public_token}").json()["status"] == "paid"

        # Verify A2 is still sent
        assert client.get(f"/api/public/invoices/{db_a2.public_token}").json()["status"] == "sent"

        # Verify B1 is still sent
        assert client.get(f"/api/public/invoices/{db_b1.public_token}").json()["status"] == "sent"

    def test_13_token_stability_across_invoice_updates(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """Test 25: Public token remains stable and unchanged after normal merchant invoice updates."""
        token_a, _ = auth_user_pub_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Initial Task", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        original_token = db_inv.public_token

        # Update notes and line items via authenticated PUT
        update_res = client.put(
            f"/api/invoices/{inv_id}",
            json={
                "notes": "Updated instructions",
                "items": [{"description": "Updated Task", "quantity": 2.0, "rate": 150.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert update_res.status_code == 200

        # Reload from DB and verify token is unchanged
        db_session.expire_all()
        db_inv_after = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        assert db_inv_after.public_token == original_token

        # Verify public endpoint with original token returns updated content
        pub_res = client.get(f"/api/public/invoices/{original_token}")
        assert pub_res.status_code == 200
        assert pub_res.json()["notes"] == "Updated instructions"
        assert pub_res.json()["total"] == "300.00"

    def test_14_existing_old_tokens_remain_valid(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """Test 26: Existing invoices with old hex tokens remain valid and functional."""
        token_a, _ = auth_user_pub_a
        # Manually create or simulate an existing 32-char hex token
        old_hex_token = uuid.uuid4().hex  # 32-character hex token from previous implementation
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Legacy Token Test", "quantity": 1.0, "rate": 50.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        # Manually set old hex token in DB
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        db_inv.public_token = old_hex_token
        db_session.commit()

        # Verify public GET works with old hex token
        get_res = client.get(f"/api/public/invoices/{old_hex_token}")
        assert get_res.status_code == 200
        assert get_res.json()["status"] == "sent"

        # Verify payment works with old hex token
        pay_res = client.post(f"/api/public/invoices/{old_hex_token}/pay")
        assert pay_res.status_code == 200
        assert pay_res.json()["status"] == "paid"

    def test_15_public_user_cannot_modify_invoice(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """Test 29: Public user cannot modify invoice or totals through public endpoints."""
        token_a, _ = auth_user_pub_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Fixed Price Service", "quantity": 1.0, "rate": 750.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        pub_token = db_inv.public_token

        # Attempt PUT to public endpoint (should return 405 Method Not Allowed)
        put_res = client.put(f"/api/public/invoices/{pub_token}", json={"total": "1.00", "notes": "Hacked"})
        assert put_res.status_code == 405

        # Attempt DELETE to public endpoint
        del_res = client.delete(f"/api/public/invoices/{pub_token}")
        assert del_res.status_code == 405

        # Verify payment POST with malicious body cannot alter price or status to anything other than paid
        pay_res = client.post(f"/api/public/invoices/{pub_token}/pay", json={"status": "draft", "total": "0.01"})
        assert pay_res.status_code == 200
        assert pay_res.json()["total"] == "750.00"
        assert pay_res.json()["status"] == "paid"

    def test_16_concurrent_payment_requests_protection(self, auth_user_pub_a, client_pub_a, db_session: Session):
        """
        Test 30: Concurrency row-lock protection:
        Two simultaneous payment requests for the same token execute safely.
        Exactly one succeeds (200), and the other fails with already paid (400).
        """
        token_a, _ = auth_user_pub_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_pub_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [{"description": "Concurrent Race Test", "quantity": 1.0, "rate": 999.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        pub_token = db_inv.public_token

        def send_payment():
            c = TestClient(app)
            return c.post(f"/api/public/invoices/{pub_token}/pay")

        # Execute 2 concurrent requests
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(send_payment) for _ in range(2)]
            results = [f.result() for f in futures]

        status_codes = sorted([r.status_code for r in results])
        # Exactly one must be 200 (Success) and the other 400 (Already paid)
        assert status_codes == [200, 400], f"Expected [200, 400] but got {status_codes}"

        # Confirm final status in DB is paid with valid paid_at
        db_session.expire_all()
        final_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        assert final_inv.status == "paid"
        assert final_inv.paid_at is not None


if __name__ == "__main__":
    pytest.main(["-v", __file__])
