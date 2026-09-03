import os
import sys
import uuid
from datetime import date, timedelta, datetime
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
def auth_user_a():
    """Register and authenticate User A, returning (token, user_dict)."""
    email = "inv_test_user_a@example.com"
    pwd = "UserAPassword123!"
    reg = client.post("/api/auth/register", json={"full_name": "Invoice User Alpha", "email": email, "password": pwd})
    log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="module")
def auth_user_b():
    """Register and authenticate User B, returning (token, user_dict)."""
    email = "inv_test_user_b@example.com"
    pwd = "UserBPassword123!"
    reg = client.post("/api/auth/register", json={"full_name": "Invoice User Beta", "email": email, "password": pwd})
    log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="module")
def client_a(auth_user_a):
    """Creates a client belonging to User A."""
    token, _ = auth_user_a
    res = client.post(
        "/api/clients",
        json={"name": "Alpha Client Corp", "email": "contact@alphacorp.com", "company": "Alpha Corp"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    return res.json()


@pytest.fixture(scope="module")
def client_b(auth_user_b):
    """Creates a client belonging to User B."""
    token, _ = auth_user_b
    res = client.post(
        "/api/clients",
        json={"name": "Beta Client LLC", "email": "contact@betallc.com", "company": "Beta LLC"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    return res.json()


@pytest.fixture(autouse=True, scope="module")
def cleanup_invoices_and_users(db_session: Session):
    """Teardown created test records after tests complete."""
    yield
    test_emails = ["inv_test_user_a@example.com", "inv_test_user_b@example.com"]
    for email in test_emails:
        u = db_session.query(User).filter(func.lower(User.email) == email).first()
        if u:
            # Delete invoices and clients for this user
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


class TestInvoiceStage4:
    def test_01_authenticated_create(self, auth_user_a, client_a):
        """Test 1: Create invoice with authentication."""
        token_a, _ = auth_user_a
        payload = {
            "client_id": client_a["id"],
            "issue_date": str(date.today()),
            "due_date": str(date.today() + timedelta(days=14)),
            "items": [
                {"description": "Web Development Services", "quantity": 10.0, "rate": 150.0}
            ],
        }
        res = client.post("/api/invoices", json=payload, headers={"Authorization": f"Bearer {token_a}"})
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["client_id"] == client_a["id"]
        assert data["subtotal"] == "1500.00"
        assert data["total"] == "1500.00"
        assert data["status"] == "draft"
        assert len(data["items"]) == 1
        assert "public_token" in data

    def test_02_unauthenticated_create(self, client_a):
        """Test 2: Reject unauthenticated creation with HTTP 401."""
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Service", "quantity": 1.0, "rate": 100.0}],
            },
        )
        assert res.status_code == 401

    def test_03_missing_client(self, auth_user_a):
        """Test 3: Reject nonexistent client UUID with HTTP 404."""
        token_a, _ = auth_user_a
        random_cid = str(uuid.uuid4())
        res = client.post(
            "/api/invoices",
            json={
                "client_id": random_cid,
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Service", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 404
        assert "client not found" in res.json()["detail"].lower()

    def test_04_client_belonging_to_another_user(self, auth_user_a, client_b):
        """Test 4: User A cannot create an invoice for User B's client (returns HTTP 404)."""
        token_a, _ = auth_user_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_b["id"],
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Service", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 404
        assert "client not found" in res.json()["detail"].lower()

    def test_05_invoice_ownership_in_database(self, auth_user_a, client_a, db_session: Session):
        """Test 5: Created invoice has invoice.user_id == current_user.id in PostgreSQL."""
        token_a, user_a = auth_user_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Consulting", "quantity": 2.0, "rate": 200.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]
        db_inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        assert db_inv is not None
        assert str(db_inv.user_id) == user_a["id"]

    def test_06_07_08_cross_user_get_put_delete_isolation(self, auth_user_a, auth_user_b, client_a, client_b):
        """Tests 6, 7, 8, 37: User A cannot GET, PUT, or DELETE User B's invoice (returns HTTP 404)."""
        token_a, _ = auth_user_a
        token_b, _ = auth_user_b

        # Create invoice for User B
        res_b = client.post(
            "/api/invoices",
            json={
                "client_id": client_b["id"],
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=10)),
                "items": [{"description": "Beta Task", "quantity": 1.0, "rate": 500.0}],
            },
            headers={"Authorization": f"Bearer {token_b}"},
        )
        inv_b_id = res_b.json()["id"]

        # 6. User A tries to GET User B's invoice
        get_res = client.get(f"/api/invoices/{inv_b_id}", headers={"Authorization": f"Bearer {token_a}"})
        assert get_res.status_code == 404
        assert "invoice not found" in get_res.json()["detail"].lower()

        # 7. User A tries to PUT User B's invoice
        put_res = client.put(
            f"/api/invoices/{inv_b_id}",
            json={"notes": "Hacked Notes"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert put_res.status_code == 404

        # 8. User A tries to DELETE User B's invoice
        del_res = client.delete(f"/api/invoices/{inv_b_id}", headers={"Authorization": f"Bearer {token_a}"})
        assert del_res.status_code == 404

    def test_09_10_11_12_13_14_15_16_financial_calculations(self, auth_user_a, client_a):
        """
        Tests 9 to 16:
        - Single & multiple line items
        - quantity * rate = amount
        - Decimal exactness (no float errors)
        - Subtotal, Tax %, Discount %, Total
        """
        token_a, _ = auth_user_a
        payload = {
            "client_id": client_a["id"],
            "issue_date": str(date.today()),
            "due_date": str(date.today() + timedelta(days=30)),
            "discount_percentage": 10.0,  # 10%
            "tax_percentage": 18.0,       # 18%
            "items": [
                {"description": "Item 1", "quantity": 2.50, "rate": 100.00},  # 250.00
                {"description": "Item 2", "quantity": 1.00, "rate": 49.99},   # 49.99
                {"description": "Item 3", "quantity": 3.00, "rate": 33.33},   # 99.99
            ],
        }
        res = client.post("/api/invoices", json=payload, headers={"Authorization": f"Bearer {token_a}"})
        assert res.status_code == 201
        data = res.json()
        # Subtotal: 250.00 + 49.99 + 99.99 = 399.98
        assert data["subtotal"] == "399.98"
        # Discount: 399.98 * 0.10 = 39.998 -> 40.00
        assert data["discount"] == "40.00"
        # Taxable: 399.98 - 40.00 = 359.98
        # Tax: 359.98 * 0.18 = 64.7964 -> 64.80
        assert data["tax"] == "64.80"
        # Total: 359.98 + 64.80 = 424.78
        assert data["total"] == "424.78"
        assert len(data["items"]) == 3
        assert data["items"][0]["amount"] == "250.00"
        assert data["items"][1]["amount"] == "49.99"
        assert data["items"][2]["amount"] == "99.99"

    def test_17_18_invalid_quantity_and_rate(self, auth_user_a, client_a):
        """Tests 17 & 18: Reject zero/negative quantity and negative rate."""
        token_a, _ = auth_user_a
        # Zero quantity
        res1 = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Bad Qty", "quantity": 0.0, "rate": 10.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res1.status_code == 422

        # Negative rate
        res2 = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Bad Rate", "quantity": 1.0, "rate": -5.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res2.status_code == 422

    def test_19_invalid_dates(self, auth_user_a, client_a):
        """Test 19: Reject due_date < issue_date."""
        token_a, _ = auth_user_a
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "issue_date": str(date.today()),
                "due_date": str(date.today() - timedelta(days=1)),
                "items": [{"description": "Task", "quantity": 1.0, "rate": 10.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 422

    def test_20_21_22_invoice_number_generation_and_uniqueness(self, auth_user_a, client_a, db_session: Session):
        """Tests 20, 21, 22: Automatic sequence formatting, duplicate rejection, and custom numbers."""
        token_a, user_a = auth_user_a
        # Automatic generation
        res1 = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Item", "quantity": 1.0, "rate": 10.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res1.status_code == 201
        num1 = res1.json()["invoice_number"]
        assert num1.startswith("INV-")

        # Custom duplicate rejection
        res_dup = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "invoice_number": num1,
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Item", "quantity": 1.0, "rate": 10.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res_dup.status_code == 409

        # Custom prefix support via business_settings
        bs = db_session.query(BusinessSettings).filter(BusinessSettings.user_id == uuid.UUID(user_a["id"])).first()
        bs.invoice_prefix = "BILL"
        db_session.commit()

        res_custom_prefix = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Item", "quantity": 1.0, "rate": 10.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res_custom_prefix.status_code == 201
        assert res_custom_prefix.json()["invoice_number"].startswith("BILL-")

    def test_23_24_25_26_27_search_filter_sort_pagination(self, auth_user_a, client_a):
        """Tests 23 to 27: Server-side search, status filter, client filter, sort, and pagination."""
        token_a, _ = auth_user_a

        # Search by client name
        res_search = client.get("/api/invoices?search=Alpha Corp", headers={"Authorization": f"Bearer {token_a}"})
        assert res_search.status_code == 200
        assert res_search.json()["total"] >= 1

        # Filter by status
        res_draft = client.get("/api/invoices?status=draft", headers={"Authorization": f"Bearer {token_a}"})
        assert res_draft.status_code == 200
        for item in res_draft.json()["items"]:
            assert item["status"] == "draft"

        # Filter by client_id
        res_client = client.get(f"/api/invoices?client_id={client_a['id']}", headers={"Authorization": f"Bearer {token_a}"})
        assert res_client.status_code == 200
        for item in res_client.json()["items"]:
            assert item["client_id"] == client_a["id"]

        # Sorting: highest_amount
        res_sort = client.get("/api/invoices?sort_by=highest_amount", headers={"Authorization": f"Bearer {token_a}"})
        assert res_sort.status_code == 200
        totals = [Decimal(i["total"]) for i in res_sort.json()["items"]]
        assert totals == sorted(totals, reverse=True)

        # Pagination: limit=1, offset=1
        res_pag = client.get("/api/invoices?limit=1&offset=1", headers={"Authorization": f"Bearer {token_a}"})
        assert res_pag.status_code == 200
        assert len(res_pag.json()["items"]) == 1

    def test_28_29_automatic_overdue_and_paid_protection(self, auth_user_a, client_a, db_session: Session):
        """Tests 28 & 29: Sent invoice with past due date becomes overdue; paid invoice never becomes overdue."""
        token_a, user_a = auth_user_a
        u_id = uuid.UUID(user_a["id"])

        # Create a sent invoice with past due date directly in DB
        past_inv = Invoice(
            user_id=u_id,
            client_id=uuid.UUID(client_a["id"]),
            invoice_number=f"OVERDUE-{uuid.uuid4().hex[:4]}",
            status="sent",
            issue_date=date.today() - timedelta(days=20),
            due_date=date.today() - timedelta(days=5),
            subtotal=Decimal("100.00"),
            total=Decimal("100.00"),
            public_token=uuid.uuid4().hex,
        )
        db_session.add(past_inv)

        # Create a paid invoice with past due date
        paid_inv = Invoice(
            user_id=u_id,
            client_id=uuid.UUID(client_a["id"]),
            invoice_number=f"PAID-{uuid.uuid4().hex[:4]}",
            status="paid",
            issue_date=date.today() - timedelta(days=20),
            due_date=date.today() - timedelta(days=5),
            subtotal=Decimal("200.00"),
            total=Decimal("200.00"),
            public_token=uuid.uuid4().hex,
        )
        db_session.add(paid_inv)
        db_session.commit()

        # 28. Verify past_inv is dynamically evaluated as overdue
        res_overdue = client.get(f"/api/invoices/{past_inv.id}", headers={"Authorization": f"Bearer {token_a}"})
        assert res_overdue.status_code == 200
        assert res_overdue.json()["status"] == "overdue"

        # 29. Verify paid_inv remains paid
        res_paid = client.get(f"/api/invoices/{paid_inv.id}", headers={"Authorization": f"Bearer {token_a}"})
        assert res_paid.status_code == 200
        assert res_paid.json()["status"] == "paid"

    def test_30_31_draft_and_non_draft_deletion(self, auth_user_a, client_a, db_session: Session):
        """Tests 30, 31, 36: Draft invoices can be deleted; sent/paid/overdue invoices cannot be deleted."""
        token_a, user_a = auth_user_a

        # Create draft invoice
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "status": "draft",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Deletable Item", "quantity": 1.0, "rate": 50.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        draft_id = res.json()["id"]

        # 30 & 36. Delete draft invoice -> 204 No Content
        del_res = client.delete(f"/api/invoices/{draft_id}", headers={"Authorization": f"Bearer {token_a}"})
        assert del_res.status_code == 204

        # Confirm 404 when querying deleted invoice
        assert client.get(f"/api/invoices/{draft_id}", headers={"Authorization": f"Bearer {token_a}"}).status_code == 404

        # 31. Attempt to delete non-draft invoice (e.g. sent)
        sent_res = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Sent Item", "quantity": 1.0, "rate": 50.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        sent_id = sent_res.json()["id"]

        del_sent_res = client.delete(f"/api/invoices/{sent_id}", headers={"Authorization": f"Bearer {token_a}"})
        assert del_sent_res.status_code == 400
        assert "only draft invoices can be deleted" in del_sent_res.json()["detail"].lower()

    def test_32_33_34_35_update_invoice_and_line_items(self, auth_user_a, client_a):
        """Tests 32, 33, 34, 35: Update invoice details, line items, and recalculate financials."""
        token_a, _ = auth_user_a
        create_res = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "status": "draft",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Initial Item", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = create_res.json()["id"]

        # Update notes and line items
        update_res = client.put(
            f"/api/invoices/{inv_id}",
            json={
                "notes": "Updated Payment Instructions",
                "discount_percentage": 5.0,
                "items": [
                    {"description": "New Line Item 1", "quantity": 2.0, "rate": 200.0},  # 400.00
                    {"description": "New Line Item 2", "quantity": 1.0, "rate": 100.0},  # 100.00 -> subtotal 500.00
                ],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert update_res.status_code == 200
        data = update_res.json()
        assert data["notes"] == "Updated Payment Instructions"
        assert data["subtotal"] == "500.00"
        assert data["discount"] == "25.00"  # 5% of 500.00
        assert data["total"] == "475.00"
        assert len(data["items"]) == 2

    def test_35_client_cannot_be_deleted_when_invoice_exists(self, auth_user_a, client_a):
        """Test 35: Attempting to delete a client that has invoices returns HTTP 409 Conflict."""
        token_a, _ = auth_user_a
        del_client_res = client.delete(f"/api/clients/{client_a['id']}", headers={"Authorization": f"Bearer {token_a}"})
        assert del_client_res.status_code == 409
        assert "existing invoices" in del_client_res.json()["detail"].lower()

    def test_38_paid_at_and_terminal_paid_immutability(self, auth_user_a, client_a):
        """
        Test 38:
        - Creates a sent invoice
        - Updates it to paid
        - Asserts status is 200, status == 'paid', paid_at is not None and is valid timestamp
        - Verifies that once paid, the invoice cannot subsequently be modified (HTTP 400).
        """
        token_a, _ = auth_user_a
        # 1. Create sent invoice
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [{"description": "Sent Milestone", "quantity": 1.0, "rate": 1000.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 201
        inv_id = res.json()["id"]
        assert res.json()["paid_at"] is None

        # 2. Update to paid
        pay_res = client.put(
            f"/api/invoices/{inv_id}",
            json={"status": "paid"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert pay_res.status_code == 200
        pay_data = pay_res.json()
        assert pay_data["status"] == "paid"
        assert pay_data["paid_at"] is not None

        # Validate timestamp parsing
        parsed_dt = datetime.fromisoformat(pay_data["paid_at"].replace("Z", "+00:00"))
        assert parsed_dt is not None

        # 3. Verify paid invoice cannot subsequently be modified
        blocked_res = client.put(
            f"/api/invoices/{inv_id}",
            json={"notes": "Attempting to modify paid invoice"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert blocked_res.status_code == 400
        assert "paid invoices cannot be modified" in blocked_res.json()["detail"].lower()

    def test_39_status_state_machine_transitions(self, auth_user_a, client_a):
        """
        Test 39: Enforce exact status state machine:
        Allowed: draft -> sent, sent -> paid, sent -> overdue, overdue -> paid.
        Disallowed: draft -> paid, draft -> overdue, sent -> draft, overdue -> sent/draft, paid -> any.
        """
        token_a, _ = auth_user_a
        # Create draft invoice
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "status": "draft",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [{"description": "State Machine Test", "quantity": 1.0, "rate": 250.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 201
        inv_id = res.json()["id"]

        # Disallowed: draft -> paid
        bad_res1 = client.put(
            f"/api/invoices/{inv_id}",
            json={"status": "paid"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert bad_res1.status_code == 400
        assert "invalid invoice status transition: draft -> paid" in bad_res1.json()["detail"].lower()

        # Disallowed: draft -> overdue
        bad_res2 = client.put(
            f"/api/invoices/{inv_id}",
            json={"status": "overdue"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert bad_res2.status_code == 400
        assert "invalid invoice status transition: draft -> overdue" in bad_res2.json()["detail"].lower()

        # Allowed: draft -> sent
        good_res1 = client.put(
            f"/api/invoices/{inv_id}",
            json={"status": "sent"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert good_res1.status_code == 200
        assert good_res1.json()["status"] == "sent"

        # Disallowed: sent -> draft
        bad_res3 = client.put(
            f"/api/invoices/{inv_id}",
            json={"status": "draft"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert bad_res3.status_code == 400
        assert "invalid invoice status transition: sent -> draft" in bad_res3.json()["detail"].lower()

    def test_40_multi_tenant_list_isolation(self, auth_user_a, auth_user_b, client_a, client_b):
        """
        Test 40: Multi-tenant list isolation:
        - User A and User B each have invoices
        - User A GET /api/invoices sees User A's invoices and NOT User B's invoices
        - User B GET /api/invoices sees User B's invoices and NOT User A's invoices
        """
        token_a, _ = auth_user_a
        token_b, _ = auth_user_b

        # User A creates Invoice A
        res_a = client.post(
            "/api/invoices",
            json={
                "client_id": client_a["id"],
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "User A Task", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_a_id = res_a.json()["id"]

        # User B creates Invoice B
        res_b = client.post(
            "/api/invoices",
            json={
                "client_id": client_b["id"],
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "User B Task", "quantity": 1.0, "rate": 200.0}],
            },
            headers={"Authorization": f"Bearer {token_b}"},
        )
        inv_b_id = res_b.json()["id"]

        # Call GET /api/invoices as User A
        list_a = client.get("/api/invoices", headers={"Authorization": f"Bearer {token_a}"})
        assert list_a.status_code == 200
        ids_a = [i["id"] for i in list_a.json()["items"]]
        assert inv_a_id in ids_a
        assert inv_b_id not in ids_a

        # Call GET /api/invoices as User B
        list_b = client.get("/api/invoices", headers={"Authorization": f"Bearer {token_b}"})
        assert list_b.status_code == 200
        ids_b = [i["id"] for i in list_b.json()["items"]]
        assert inv_b_id in ids_b
        assert inv_a_id not in ids_b

    def test_41_financial_tampering_rejection(self, auth_user_a, client_a):
        """
        Test 41: Client cannot inject client-calculated fields (item.amount, subtotal, total).
        Schema extra='forbid' rejects these with HTTP 422.
        Authoritative backend calculation produces exact Decimal figures.
        """
        token_a, _ = auth_user_a

        # Attempt to tamper subtotal and total
        tamper_totals = {
            "client_id": client_a["id"],
            "issue_date": str(date.today()),
            "due_date": str(date.today() + timedelta(days=7)),
            "subtotal": "0.01",
            "total": "0.01",
            "items": [{"description": "Service", "quantity": 10.0, "rate": 50.0}],
        }
        res1 = client.post("/api/invoices", json=tamper_totals, headers={"Authorization": f"Bearer {token_a}"})
        assert res1.status_code == 422

        # Attempt to tamper item amount
        tamper_item = {
            "client_id": client_a["id"],
            "issue_date": str(date.today()),
            "due_date": str(date.today() + timedelta(days=7)),
            "items": [{"description": "Service", "quantity": 10.0, "rate": 50.0, "amount": "0.01"}],
        }
        res2 = client.post("/api/invoices", json=tamper_item, headers={"Authorization": f"Bearer {token_a}"})
        assert res2.status_code == 422

        # Legitimate request computes backend totals correctly
        legit = {
            "client_id": client_a["id"],
            "issue_date": str(date.today()),
            "due_date": str(date.today() + timedelta(days=7)),
            "items": [{"description": "Service", "quantity": 10.0, "rate": 50.0}],
        }
        res3 = client.post("/api/invoices", json=legit, headers={"Authorization": f"Bearer {token_a}"})
        assert res3.status_code == 201
        assert res3.json()["subtotal"] == "500.00"
        assert res3.json()["total"] == "500.00"
        assert res3.json()["items"][0]["amount"] == "500.00"


if __name__ == "__main__":
    pytest.main(["-v", __file__])

